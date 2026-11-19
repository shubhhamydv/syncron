/**
 * DataStraw AI Tech Internship - Smart Roster Management System
 * Phase 1: Database Seed
 *
 * TEST TRAPS INCLUDED IN THIS SEED DATA:
 * =========================================================================================
 * 1. 365-day single-resource brand with Sunday off:
 *    - Brand: "Kalyan Organics" (Process: "CS")
 *    - Rule: Operates 7 days a week (workingDays: [0, 1, 2, 3, 4, 5, 6]).
 *    - Employee: Aarav Sharma is the ONLY assigned employee, but has weekly off on Sunday (day 0).
 *    - Result: Coverage gap every Sunday.
 *
 * 2. Single-resource brand with employee on 3-day approved leave:
 *    - Brand: "Zingy Spices" (Process: "NDR")
 *    - Rule: Operates Mon-Sat (workingDays: [1, 2, 3, 4, 5, 6]).
 *    - Employee: Priya Patel is the ONLY assigned employee.
 *    - Leave: Approved leave from 2026-12-07 through 2026-12-09 inclusive (Mon-Wed, 3 working days).
 *      NOTE: In EmployeeAvailability, `endDate` is inclusive (both startDate and endDate are included).
 *    - Result: Complete coverage gap on Dec 7, 8, and 9.
 *
 * 3. Multi-resource brand with 2 employees, both unavailable on the same date:
 *    - Brand: "Indus Techworks" (Process: "Retention", minimumStaff: 2)
 *    - Employees: Rohan Iyer and Sneha Nair.
 *    - Date: Dec 15, 2026 (Tuesday).
 *    - Unavailability: Rohan Iyer on approved leave; Sneha Nair has recurring weekly off on Tuesday.
 *    - Result: 0 available staff on Dec 15 when 2 are required.
 *
 * 4. Employee assigned to 2 different brands (workload & overlap test):
 *    - Employee: Vikram Malhotra
 *    - Assignments: "Veda Naturals" (CS, Mon-Fri) and "Desi Threads" (CS, Fri-Sat).
 *    - Operating Days: Overlap on only ONE weekday per week (Friday).
 *    - Result: Overlapping shift demand and OVERLAP conflict on Fridays.
 *
 * 5. Brand that does not operate on public holidays vs. brand that does:
 *    - Holiday: Christmas Day (Dec 25, 2026).
 *    - Brand "ChaiMakers": operatesOnPublicHolidays = false (staff off).
 *    - Brand "Bharat Bazaar": operatesOnPublicHolidays = true (staff required).
 *
 * 6. Multi-resource brand with an active backup employee available for replacement:
 *    - Brand: "SpiceRoute Global" (Process: "CS", minimumStaff: 2)
 *    - Assigned Employees: Kunal Shah, Tanvi Kapoor, Siddharth Sen (3 total).
 *    - Date: Dec 18, 2026 (Friday).
 *    - Unavailability: Kunal Shah on approved comp-off. Tanvi Kapoor is available.
 *    - Backup: Siddharth Sen is active, has no leave, and has Wednesday off, so is available on Friday.
 *    - Result: Perfect test case for the replacement scheduling engine.
 * =========================================================================================
 */

import {
  PrismaClient,
  EmployeeStatus,
  BrandStatus,
  AvailabilityType,
  AvailabilityStatus,
} from '@prisma/client';
import { parseISO } from 'date-fns';

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('Cleaning existing data for idempotent re-run...');
  // Delete records in reverse dependency order
  await prisma.conflict.deleteMany({});
  await prisma.rosterEntry.deleteMany({});
  await prisma.roster.deleteMany({});
  await prisma.coverageRequirement.deleteMany({});
  await prisma.operatingRule.deleteMany({});
  await prisma.assignment.deleteMany({});
  await prisma.employeeAvailability.deleteMany({});
  await prisma.publicHoliday.deleteMany({});
  
  // Unset lead references before deleting employees and pods
  await prisma.pod.updateMany({ data: { leadEmployeeId: null } });
  await prisma.employee.deleteMany({});
  await prisma.pod.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.process.deleteMany({});
  console.log('Database clean complete.');
}

async function main() {
  await cleanDatabase();

  console.log('Starting seed...');

  // 1. Seed Processes (CS, ACC, NDR, Retention, Catalog, Escalations)
  const processNames = ['CS', 'ACC', 'NDR', 'Retention', 'Catalog', 'Escalations'];
  const processes: Record<string, any> = {};
  for (const name of processNames) {
    processes[name] = await prisma.process.create({
      data: { name },
    });
  }
  console.log(`Created ${Object.keys(processes).length} processes.`);

  // 2. Seed Pods (5 pods)
  const podDefinitions = [
    { name: 'Pod Alpha - Core Commerce' },
    { name: 'Pod Beta - Risk & Escalations' },
    { name: 'Pod Gamma - Enterprise & Retention' },
    { name: 'Pod Delta - High Volume Support' },
    { name: 'Pod Epsilon - Operations & Logistics' },
  ];

  const pods: Record<string, any> = {};
  for (const def of podDefinitions) {
    pods[def.name] = await prisma.pod.create({
      data: { name: def.name },
    });
  }
  console.log(`Created ${Object.keys(pods).length} pods.`);

  // 3. Seed 36 Employees across 5 pods
  // Pod distribution: Alpha (8), Beta (7), Gamma (7), Delta (7), Epsilon (7) = 36 total
  // NOTE: In the clean baseline, single-resource brand employees have their weekly off set to Sunday
  // (a day the brand is closed) so there are no structural weekly gaps except for deliberate traps.
  const employeeData = [
    // Pod Alpha (8 employees) - Lead: Aarav Sharma
    { name: 'Aarav Sharma', email: 'aarav.sharma@datastraw.io', pod: 'Pod Alpha - Core Commerce', isLead: true, weeklyOff: 0 }, // Sun (Trap T1: Kalyan CS 365-day gap)
    { name: 'Meera Nambiar', email: 'meera.nambiar@datastraw.io', pod: 'Pod Alpha - Core Commerce', isLead: false, weeklyOff: 0 }, // Sun (Kalyan ACC Mon-Sat, Sun closed)
    { name: 'Rohan Sen', email: 'rohan.sen@datastraw.io', pod: 'Pod Alpha - Core Commerce', isLead: false, weeklyOff: 3 }, // Wed (Bharat Bazaar CS: staggered Wed off)
    { name: 'Tanvi Kapoor', email: 'tanvi.kapoor@datastraw.io', pod: 'Pod Alpha - Core Commerce', isLead: false, weeklyOff: 0 }, // Sun (SpiceRoute CS Mon-Sat, Sun closed)
    { name: 'Nikhil Saxena', email: 'nikhil.saxena@datastraw.io', pod: 'Pod Alpha - Core Commerce', isLead: false, weeklyOff: 0 }, // Sun (Bharat Bazaar ACC Mon-Sat, Sun closed)
    { name: 'Radhika Mittal', email: 'radhika.mittal@datastraw.io', pod: 'Pod Alpha - Core Commerce', isLead: false, weeklyOff: 0 }, // Sun (Bharat Bazaar ACC Mon-Sat, Sun closed)
    { name: 'Amit Trivedi', email: 'amit.trivedi@datastraw.io', pod: 'Pod Alpha - Core Commerce', isLead: false, weeklyOff: 0 }, // Sun (Indus Escalations Mon-Sat, Sun closed)
    { name: 'Shilpa Kulkarni', email: 'shilpa.kulkarni@datastraw.io', pod: 'Pod Alpha - Core Commerce', isLead: false, weeklyOff: 0 }, // Sun (Indus Escalations Mon-Sat, Sun closed)

    // Pod Beta (7 employees) - Lead: Priya Patel
    { name: 'Priya Patel', email: 'priya.patel@datastraw.io', pod: 'Pod Beta - Risk & Escalations', isLead: true, weeklyOff: 0 }, // Sun (Zingy NDR Mon-Sat, Sun closed; leave Dec 7-9 is T2)
    { name: 'Arjun Singh', email: 'arjun.singh@datastraw.io', pod: 'Pod Beta - Risk & Escalations', isLead: false, weeklyOff: 0 }, // Sun (SpiceRoute CS Mon-Sat, Sun closed)
    { name: 'Neha Joshi', email: 'neha.joshi@datastraw.io', pod: 'Pod Beta - Risk & Escalations', isLead: false, weeklyOff: 0 }, // Sun (ChaiMakers CS Mon-Sat, Sun closed)
    { name: 'Swati Deshmukh', email: 'swati.deshmukh@datastraw.io', pod: 'Pod Beta - Risk & Escalations', isLead: false, weeklyOff: 0 }, // Sun (Zingy CS Mon-Sat, Sun closed)
    { name: 'Harsh Vardhan', email: 'harsh.vardhan@datastraw.io', pod: 'Pod Beta - Risk & Escalations', isLead: false, weeklyOff: 0 }, // Sun (Veda Retention Mon-Sat, Sun closed)
    { name: 'Devansh Mukherjee', email: 'devansh.mukherjee@datastraw.io', pod: 'Pod Beta - Risk & Escalations', isLead: false, weeklyOff: 0 }, // Sun (Desi Catalog Mon-Sat, Sun closed)
    { name: 'Shalini Menon', email: 'shalini.menon@datastraw.io', pod: 'Pod Beta - Risk & Escalations', isLead: false, weeklyOff: 0 }, // Sun (ChaiMakers ACC Mon-Sat, Sun closed)

    // Pod Gamma (7 employees) - Lead: Rohan Iyer
    { name: 'Rohan Iyer', email: 'rohan.iyer@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: true, weeklyOff: 0 }, // Sun (Indus Retention Mon-Sat, Sun closed; leave Dec 15 is T3)
    { name: 'Sneha Nair', email: 'sneha.nair@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: false, weeklyOff: 2 }, // Tue (Trap T3: Indus Retention Tue off)
    { name: 'Kunal Shah', email: 'kunal.shah@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: false, weeklyOff: 0 }, // Sun (SpiceRoute CS Mon-Sat, Sun closed; comp-off Dec 18 is T6)
    { name: 'Siddharth Sen', email: 'siddharth.sen@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: false, weeklyOff: 3 }, // Wed (Trap T6 & T7: SpiceRoute CS backup; available on Sun & Fri)
    { name: 'Gaurav Chopra', email: 'gaurav.chopra@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: false, weeklyOff: 6 }, // Sat (MithaiCraft CS Mon-Fri, Sat closed; available on Sun)
    { name: 'Ritu Bhatia', email: 'ritu.bhatia@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: false, weeklyOff: 0 }, // Sun (Aura NDR Mon-Sat, Sun closed)
    { name: 'Ishaan Chatterjee', email: 'ishaan.chatterjee@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: false, weeklyOff: 0 }, // Sun (Himalayan CS Mon-Sat, Sun closed)

    // Pod Delta (7 employees) - Lead: Vikram Malhotra
    { name: 'Vikram Malhotra', email: 'vikram.malhotra@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: true, weeklyOff: 0 }, // Sun (Trap T4: Veda Mon-Fri, Desi Fri-Sat; Sun closed for both)
    { name: 'Ananya Verma', email: 'ananya.verma@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 0 }, // Sun (MithaiCraft ACC Mon-Fri, Sun closed)
    { name: 'Rahul Mehta', email: 'rahul.mehta@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 0 }, // Sun (Aura CS Mon-Sat, Sun closed)
    { name: 'Pooja Gupta', email: 'pooja.gupta@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 0 }, // Sun (Himalayan Retention Mon-Sat, Sun closed)
    { name: 'Aditya Kumar', email: 'aditya.kumar@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 0 }, // Sun (Nuts & Berries Catalog Mon-Fri, Sun closed)
    { name: 'Kavita Rao', email: 'kavita.rao@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 0 }, // Sun (Kaveri CS Mon-Sat, Sun closed)
    { name: 'Varun Reddy', email: 'varun.reddy@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 1 }, // Mon (Bharat Bazaar CS: staggered Mon off)

    // Pod Epsilon (7 employees) - Lead: Divya Pillai
    { name: 'Divya Pillai', email: 'divya.pillai@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: true, weeklyOff: 2 }, // Tue (Bharat Bazaar CS: staggered Tue off)
    { name: 'Pranav Hegde', email: 'pranav.hegde@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 0 }, // Sun (Zenith NDR Mon-Sat, Sun closed)
    { name: 'Preeti Choudhury', email: 'preeti.choudhury@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 0 }, // Sun (Urban Escalations Mon-Sat, Sun closed)
    { name: 'Yash Singhania', email: 'yash.singhania@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 6 }, // Sat (Nuts & Berries CS Mon-Fri, Sat closed; available on Sun)
    { name: 'Kritika Pandey', email: 'kritika.pandey@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 0 }, // Sun (Kaveri ACC Mon-Sat, Sun closed)
    { name: 'Manikandan Raman', email: 'manikandan.raman@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 0 }, // Sun (Zenith CS Mon-Sat, Sun closed)
    { name: 'Shreya Das', email: 'shreya.das@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 0 }, // Sun (Urban CS Mon-Sat, Sun closed)
  ];

  const employees: Record<string, any> = {};
  for (const emp of employeeData) {
    const created = await prisma.employee.create({
      data: {
        name: emp.name,
        email: emp.email,
        podId: pods[emp.pod].id,
        status: EmployeeStatus.ACTIVE,
      },
    });
    employees[emp.name] = created;

    // Set pod lead if marked
    if (emp.isLead) {
      await prisma.pod.update({
        where: { id: pods[emp.pod].id },
        data: { leadEmployeeId: created.id },
      });
    }

    // Create recurring weekly off in EmployeeAvailability
    await prisma.employeeAvailability.create({
      data: {
        employeeId: created.id,
        type: AvailabilityType.WEEKLY_OFF,
        dayOfWeek: emp.weeklyOff,
        status: AvailabilityStatus.APPROVED,
        reason: 'Standard recurring weekly off',
      },
    });
  }
  console.log(`Created ${Object.keys(employees).length} employees with weekly offs and assigned pod leads.`);

  // 4. Seed Brands (15 brands: 12 single-resource = 80%, 3 multi-resource = 20%)
  const singleResourceBrandNames = [
    'Kalyan Organics',   // Trap 1: 365-day single-resource brand
    'Zingy Spices',      // Trap 2: Single-resource brand with 3-day approved leave
    'Veda Naturals',     // Trap 4: Shared employee Vikram Malhotra
    'Desi Threads',      // Trap 4: Shared employee Vikram Malhotra
    'ChaiMakers',        // Trap 5: Closed on public holidays
    'MithaiCraft',
    'Aura Ayurveda',
    'Himalayan Brews',
    'Nuts & Berries Co',
    'Kaveri Pottery',
    'Zenith Footwear',
    'Urban Dhaga',
  ];

  const multiResourceBrandNames = [
    'Bharat Bazaar',     // Trap 5: Open on public holidays (operatesOnPublicHolidays = true)
    'Indus Techworks',   // Trap 3: 2 employees both unavailable on 2026-12-15
    'SpiceRoute Global', // Trap 6: Backup employee available for replacement demo
  ];

  const brands: Record<string, any> = {};
  for (const name of [...singleResourceBrandNames, ...multiResourceBrandNames]) {
    brands[name] = await prisma.brand.create({
      data: {
        name,
        status: BrandStatus.ACTIVE,
      },
    });
  }
  console.log(`Created ${Object.keys(brands).length} brands (12 Single-Resource, 3 Multi-Resource).`);

  // 5. Seed Brand Assignments, Operating Rules, and Coverage Requirements
  // Mon-Sat: [1, 2, 3, 4, 5, 6]
  // Mon-Fri: [1, 2, 3, 4, 5]
  // 365-day: [0, 1, 2, 3, 4, 5, 6]
  const brandConfigs: Array<{
    brand: string;
    process: string;
    assignedEmployees: string[];
    workingDays: number[];
    operatesOnPublicHolidays: boolean;
    minimumStaff: number;
  }> = [
    // --- SINGLE-RESOURCE BRANDS (Exactly 1 employee per process) ---
    // Trap 1: Kalyan Organics operates 7 days (all 365 days), Aarav Sharma has Sunday off
    {
      brand: 'Kalyan Organics',
      process: 'CS',
      assignedEmployees: ['Aarav Sharma'],
      workingDays: [0, 1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'Kalyan Organics',
      process: 'ACC',
      assignedEmployees: ['Meera Nambiar'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    // Trap 2: Zingy Spices operates Mon-Sat, Priya Patel has 3-day leave in Dec
    {
      brand: 'Zingy Spices',
      process: 'NDR',
      assignedEmployees: ['Priya Patel'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'Zingy Spices',
      process: 'CS',
      assignedEmployees: ['Swati Deshmukh'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    // Trap 4: Veda Naturals CS has Vikram Malhotra (Mon-Fri)
    {
      brand: 'Veda Naturals',
      process: 'CS',
      assignedEmployees: ['Vikram Malhotra'],
      workingDays: [1, 2, 3, 4, 5], // Mon-Fri
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'Veda Naturals',
      process: 'Retention',
      assignedEmployees: ['Harsh Vardhan'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    // Trap 4: Desi Threads CS ALSO has Vikram Malhotra (Fri-Sat, overlaps with Veda only on Friday)
    {
      brand: 'Desi Threads',
      process: 'CS',
      assignedEmployees: ['Vikram Malhotra'],
      workingDays: [5, 6], // Fri-Sat
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'Desi Threads',
      process: 'Catalog',
      assignedEmployees: ['Devansh Mukherjee'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    // Trap 5: ChaiMakers does NOT operate on public holidays
    {
      brand: 'ChaiMakers',
      process: 'CS',
      assignedEmployees: ['Neha Joshi'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'ChaiMakers',
      process: 'ACC',
      assignedEmployees: ['Shalini Menon'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    // Mon-Fri Brands
    {
      brand: 'MithaiCraft',
      process: 'ACC',
      assignedEmployees: ['Ananya Verma'],
      workingDays: [1, 2, 3, 4, 5], // Mon-Fri
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'MithaiCraft',
      process: 'CS',
      assignedEmployees: ['Gaurav Chopra'],
      workingDays: [1, 2, 3, 4, 5],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'Aura Ayurveda',
      process: 'CS',
      assignedEmployees: ['Rahul Mehta'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'Aura Ayurveda',
      process: 'NDR',
      assignedEmployees: ['Ritu Bhatia'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'Himalayan Brews',
      process: 'Retention',
      assignedEmployees: ['Pooja Gupta'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'Himalayan Brews',
      process: 'CS',
      assignedEmployees: ['Ishaan Chatterjee'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'Nuts & Berries Co',
      process: 'Catalog',
      assignedEmployees: ['Aditya Kumar'],
      workingDays: [1, 2, 3, 4, 5], // Mon-Fri
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'Nuts & Berries Co',
      process: 'CS',
      assignedEmployees: ['Yash Singhania'],
      workingDays: [1, 2, 3, 4, 5],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'Kaveri Pottery',
      process: 'CS',
      assignedEmployees: ['Kavita Rao'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'Kaveri Pottery',
      process: 'ACC',
      assignedEmployees: ['Kritika Pandey'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'Zenith Footwear',
      process: 'NDR',
      assignedEmployees: ['Pranav Hegde'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'Zenith Footwear',
      process: 'CS',
      assignedEmployees: ['Manikandan Raman'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'Urban Dhaga',
      process: 'Escalations',
      assignedEmployees: ['Preeti Choudhury'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },
    {
      brand: 'Urban Dhaga',
      process: 'CS',
      assignedEmployees: ['Shreya Das'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 1,
    },

    // --- MULTI-RESOURCE BRANDS (2-3 employees per process) ---
    // Trap 5: Bharat Bazaar operates 365 days AND operates on public holidays (operatesOnPublicHolidays = true)
    {
      brand: 'Bharat Bazaar',
      process: 'CS',
      assignedEmployees: ['Varun Reddy', 'Divya Pillai', 'Rohan Sen'],
      workingDays: [0, 1, 2, 3, 4, 5, 6], // 365 days
      operatesOnPublicHolidays: true,
      minimumStaff: 2,
    },
    {
      brand: 'Bharat Bazaar',
      process: 'ACC',
      assignedEmployees: ['Nikhil Saxena', 'Radhika Mittal'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: true,
      minimumStaff: 2,
    },
    // Trap 3: Indus Techworks Retention has 2 employees (Rohan Iyer & Sneha Nair), both unavailable on Dec 15
    {
      brand: 'Indus Techworks',
      process: 'Retention',
      assignedEmployees: ['Rohan Iyer', 'Sneha Nair'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 2,
    },
    {
      brand: 'Indus Techworks',
      process: 'Escalations',
      assignedEmployees: ['Amit Trivedi', 'Shilpa Kulkarni'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 2,
    },
    // Trap 6: SpiceRoute Global CS has 3 employees (2 primary + 1 backup Siddharth Sen)
    {
      brand: 'SpiceRoute Global',
      process: 'CS',
      assignedEmployees: ['Kunal Shah', 'Tanvi Kapoor', 'Siddharth Sen', 'Arjun Singh'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minimumStaff: 2,
    },
  ];

  let assignmentCount = 0;
  for (const cfg of brandConfigs) {
    const brand = brands[cfg.brand];
    const proc = processes[cfg.process];

    // Create Operating Rule
    await prisma.operatingRule.create({
      data: {
        brandId: brand.id,
        processId: proc.id,
        workingDays: cfg.workingDays,
        operatesOnPublicHolidays: cfg.operatesOnPublicHolidays,
      },
    });

    // Create Coverage Requirement
    await prisma.coverageRequirement.create({
      data: {
        brandId: brand.id,
        processId: proc.id,
        minimumStaff: cfg.minimumStaff,
      },
    });

    // Create Assignments
    for (const empName of cfg.assignedEmployees) {
      const emp = employees[empName];
      await prisma.assignment.create({
        data: {
          employeeId: emp.id,
          brandId: brand.id,
          processId: proc.id,
        },
      });
      assignmentCount++;
    }
  }
  console.log(`Created operating rules, coverage requirements, and ${assignmentCount} assignments.`);

  // 6. Seed Public Holidays (Next 2 months: Nov - Dec 2026)
  const publicHolidays = [
    { date: '2026-11-24T00:00:00.000Z', name: 'Guru Nanak Jayanti', region: 'National' },
    { date: '2026-12-19T00:00:00.000Z', name: 'Goa Liberation Day', region: 'Regional' },
    { date: '2026-12-24T00:00:00.000Z', name: 'Christmas Eve', region: 'Regional' },
    { date: '2026-12-25T00:00:00.000Z', name: 'Christmas Day', region: 'National' },
    { date: '2026-12-31T00:00:00.000Z', name: "New Year's Eve", region: 'Commercial' },
  ];

  for (const h of publicHolidays) {
    await prisma.publicHoliday.create({
      data: {
        date: parseISO(h.date),
        name: h.name,
        region: h.region,
      },
    });
  }
  console.log(`Created ${publicHolidays.length} public holidays for Nov-Dec 2026.`);

  // 7. Seed Specific Approved Leaves and Comp-Offs in December 2026 (Including Traps 2, 3, 6)
  // NOTE: In this system, `endDate` is INCLUSIVE (both startDate and endDate are included in the leave duration).
  const leaveData = [
    // Trap 2: Priya Patel approved leave on 3 working days (Dec 7 to Dec 9, 2026 inclusive - Mon to Wed)
    {
      employee: 'Priya Patel',
      type: AvailabilityType.LEAVE,
      startDate: '2026-12-07T00:00:00.000Z',
      endDate: '2026-12-09T00:00:00.000Z', // NOTE: endDate is inclusive
      status: AvailabilityStatus.APPROVED,
      reason: 'Approved leave for family wedding (2026-12-07 through 2026-12-09 inclusive, 3 working days)',
    },
    // Trap 3: Rohan Iyer approved leave on Dec 15, 2026 (Tuesday)
    {
      employee: 'Rohan Iyer',
      type: AvailabilityType.LEAVE,
      startDate: '2026-12-15T00:00:00.000Z',
      endDate: '2026-12-15T00:00:00.000Z', // Single-day leave, inclusive
      status: AvailabilityStatus.APPROVED,
      reason: 'Medical consultation (Trap 3: Combined with Sneha Nair Tue weekly-off)',
    },
    // Trap 6: Kunal Shah comp-off on Dec 18, 2026 (Friday)
    {
      employee: 'Kunal Shah',
      type: AvailabilityType.COMP_OFF,
      startDate: '2026-12-18T00:00:00.000Z',
      endDate: '2026-12-18T00:00:00.000Z', // Single-day comp-off, inclusive
      status: AvailabilityStatus.APPROVED,
      reason: 'Comp-off for server migration weekend support (Trap 6: Backup Siddharth Sen available)',
    },
    // Other realistic leaves
    {
      employee: 'Meera Nambiar',
      type: AvailabilityType.LEAVE,
      startDate: '2026-12-21T00:00:00.000Z',
      endDate: '2026-12-22T00:00:00.000Z',
      status: AvailabilityStatus.APPROVED,
      reason: 'Annual personal leave',
    },
    {
      employee: 'Gaurav Chopra',
      type: AvailabilityType.COMP_OFF,
      startDate: '2026-12-04T00:00:00.000Z',
      endDate: '2026-12-04T00:00:00.000Z',
      status: AvailabilityStatus.APPROVED,
      reason: 'Comp-off for festive roster coverage',
    },
    {
      employee: 'Radhika Mittal',
      type: AvailabilityType.LEAVE,
      startDate: '2026-12-28T00:00:00.000Z',
      endDate: '2026-12-30T00:00:00.000Z',
      status: AvailabilityStatus.PENDING,
      reason: 'Year-end vacation request (Pending approval)',
    },
  ];

  for (const l of leaveData) {
    const emp = employees[l.employee];
    await prisma.employeeAvailability.create({
      data: {
        employeeId: emp.id,
        type: l.type,
        startDate: parseISO(l.startDate),
        endDate: parseISO(l.endDate),
        status: l.status,
        reason: l.reason,
      },
    });
  }
  console.log(`Created ${leaveData.length} leaves and comp-offs in December 2026.`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
