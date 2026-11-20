/**
 * Database Seed Service.
 * Idempotent, production-runnable seed script.
 */

import {
  PrismaClient,
  EmployeeStatus,
  BrandStatus,
  AvailabilityType,
  AvailabilityStatus,
} from '@prisma/client';
import { parseISO } from 'date-fns';
import { prisma as defaultPrisma } from './prisma';

export async function seedDatabase(client?: PrismaClient): Promise<void> {
  const prisma = client || defaultPrisma;

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

  console.log('Starting seed...');

  // 1. Seed Processes (CS, ACC, NDR, Retention, Catalog, Escalations)
  const processNames = ['CS', 'ACC', 'NDR', 'Retention', 'Catalog', 'Escalations'];
  const processes: Record<string, any> = {};
  for (const name of processNames) {
    processes[name] = await prisma.process.create({
      data: { name },
    });
  }

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

  // 3. Seed 36 Employees across 5 pods
  const employeeData = [
    // Pod Alpha (8 employees) - Lead: Aarav Sharma
    { name: 'Aarav Sharma', email: 'aarav.sharma@datastraw.io', pod: 'Pod Alpha - Core Commerce', isLead: true, weeklyOff: 0 },
    { name: 'Meera Nambiar', email: 'meera.nambiar@datastraw.io', pod: 'Pod Alpha - Core Commerce', isLead: false, weeklyOff: 0 },
    { name: 'Rohan Sen', email: 'rohan.sen@datastraw.io', pod: 'Pod Alpha - Core Commerce', isLead: false, weeklyOff: 3 },
    { name: 'Tanvi Kapoor', email: 'tanvi.kapoor@datastraw.io', pod: 'Pod Alpha - Core Commerce', isLead: false, weeklyOff: 0 },
    { name: 'Nikhil Saxena', email: 'nikhil.saxena@datastraw.io', pod: 'Pod Alpha - Core Commerce', isLead: false, weeklyOff: 0 },
    { name: 'Radhika Mittal', email: 'radhika.mittal@datastraw.io', pod: 'Pod Alpha - Core Commerce', isLead: false, weeklyOff: 0 },
    { name: 'Amit Trivedi', email: 'amit.trivedi@datastraw.io', pod: 'Pod Alpha - Core Commerce', isLead: false, weeklyOff: 0 },
    { name: 'Shilpa Kulkarni', email: 'shilpa.kulkarni@datastraw.io', pod: 'Pod Alpha - Core Commerce', isLead: false, weeklyOff: 0 },

    // Pod Beta (7 employees) - Lead: Priya Patel
    { name: 'Priya Patel', email: 'priya.patel@datastraw.io', pod: 'Pod Beta - Risk & Escalations', isLead: true, weeklyOff: 0 },
    { name: 'Arjun Singh', email: 'arjun.singh@datastraw.io', pod: 'Pod Beta - Risk & Escalations', isLead: false, weeklyOff: 0 },
    { name: 'Neha Joshi', email: 'neha.joshi@datastraw.io', pod: 'Pod Beta - Risk & Escalations', isLead: false, weeklyOff: 0 },
    { name: 'Swati Deshmukh', email: 'swati.deshmukh@datastraw.io', pod: 'Pod Beta - Risk & Escalations', isLead: false, weeklyOff: 0 },
    { name: 'Harsh Vardhan', email: 'harsh.vardhan@datastraw.io', pod: 'Pod Beta - Risk & Escalations', isLead: false, weeklyOff: 0 },
    { name: 'Devansh Mukherjee', email: 'devansh.mukherjee@datastraw.io', pod: 'Pod Beta - Risk & Escalations', isLead: false, weeklyOff: 0 },
    { name: 'Shalini Menon', email: 'shalini.menon@datastraw.io', pod: 'Pod Beta - Risk & Escalations', isLead: false, weeklyOff: 0 },

    // Pod Gamma (7 employees) - Lead: Rohan Iyer
    { name: 'Rohan Iyer', email: 'rohan.iyer@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: true, weeklyOff: 0 },
    { name: 'Sneha Nair', email: 'sneha.nair@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: false, weeklyOff: 2 },
    { name: 'Kunal Shah', email: 'kunal.shah@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: false, weeklyOff: 0 },
    { name: 'Siddharth Sen', email: 'siddharth.sen@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: false, weeklyOff: 3 },
    { name: 'Gaurav Chopra', email: 'gaurav.chopra@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: false, weeklyOff: 6 },
    { name: 'Ritu Bhatia', email: 'ritu.bhatia@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: false, weeklyOff: 0 },
    { name: 'Ishaan Chatterjee', email: 'ishaan.chatterjee@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: false, weeklyOff: 0 },

    // Pod Delta (7 employees) - Lead: Vikram Malhotra
    { name: 'Vikram Malhotra', email: 'vikram.malhotra@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: true, weeklyOff: 0 },
    { name: 'Ananya Verma', email: 'ananya.verma@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 0 },
    { name: 'Rahul Mehta', email: 'rahul.mehta@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 0 },
    { name: 'Pooja Gupta', email: 'pooja.gupta@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 0 },
    { name: 'Aditya Kumar', email: 'aditya.kumar@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 0 },
    { name: 'Kavita Rao', email: 'kavita.rao@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 0 },
    { name: 'Varun Reddy', email: 'varun.reddy@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 1 },

    // Pod Epsilon (7 employees) - Lead: Divya Pillai
    { name: 'Divya Pillai', email: 'divya.pillai@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: true, weeklyOff: 2 },
    { name: 'Pranav Hegde', email: 'pranav.hegde@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 0 },
    { name: 'Preeti Choudhury', email: 'preeti.choudhury@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 0 },
    { name: 'Yash Singhania', email: 'yash.singhania@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 6 },
    { name: 'Kritika Pandey', email: 'kritika.pandey@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 0 },
    { name: 'Manikandan Raman', email: 'manikandan.raman@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 0 },
    { name: 'Shreya Das', email: 'shreya.das@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 0 },
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

    if (emp.isLead) {
      await prisma.pod.update({
        where: { id: pods[emp.pod].id },
        data: { leadEmployeeId: created.id },
      });
    }

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

  // 4. Seed Brands (15 brands)
  const singleResourceBrandNames = [
    'Kalyan Organics',
    'Zingy Spices',
    'Veda Naturals',
    'Desi Threads',
    'ChaiMakers',
    'MithaiCraft',
    'Aura Ayurveda',
    'Himalayan Brews',
    'Nuts & Berries Co',
    'Kaveri Pottery',
    'Zenith Footwear',
    'Urban Dhaga',
  ];

  const multiResourceBrandNames = [
    'Bharat Bazaar',
    'Indus Techworks',
    'SpiceRoute Global',
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

  // 5. Seed Brand Assignments, Operating Rules, and Coverage Requirements
  const brandConfigs = [
    // Kalyan Organics
    { brand: 'Kalyan Organics', process: 'CS', assignedEmployees: ['Aarav Sharma'], workingDays: [0, 1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    { brand: 'Kalyan Organics', process: 'ACC', assignedEmployees: ['Meera Nambiar'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    // Zingy Spices
    { brand: 'Zingy Spices', process: 'NDR', assignedEmployees: ['Priya Patel'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    { brand: 'Zingy Spices', process: 'CS', assignedEmployees: ['Swati Deshmukh'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    // Veda Naturals & Desi Threads
    { brand: 'Veda Naturals', process: 'CS', assignedEmployees: ['Vikram Malhotra'], workingDays: [1, 2, 3, 4, 5], operatesOnPublicHolidays: false, minimumStaff: 1 },
    { brand: 'Veda Naturals', process: 'Retention', assignedEmployees: ['Harsh Vardhan'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    { brand: 'Desi Threads', process: 'CS', assignedEmployees: ['Vikram Malhotra'], workingDays: [5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    { brand: 'Desi Threads', process: 'Catalog', assignedEmployees: ['Devansh Mukherjee'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    // ChaiMakers
    { brand: 'ChaiMakers', process: 'CS', assignedEmployees: ['Neha Joshi'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    { brand: 'ChaiMakers', process: 'ACC', assignedEmployees: ['Shalini Menon'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    // MithaiCraft
    { brand: 'MithaiCraft', process: 'ACC', assignedEmployees: ['Ananya Verma'], workingDays: [1, 2, 3, 4, 5], operatesOnPublicHolidays: false, minimumStaff: 1 },
    { brand: 'MithaiCraft', process: 'CS', assignedEmployees: ['Gaurav Chopra'], workingDays: [1, 2, 3, 4, 5], operatesOnPublicHolidays: false, minimumStaff: 1 },
    // Aura Ayurveda
    { brand: 'Aura Ayurveda', process: 'CS', assignedEmployees: ['Rahul Mehta'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    { brand: 'Aura Ayurveda', process: 'NDR', assignedEmployees: ['Ritu Bhatia'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    // Himalayan Brews
    { brand: 'Himalayan Brews', process: 'Retention', assignedEmployees: ['Pooja Gupta'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    { brand: 'Himalayan Brews', process: 'CS', assignedEmployees: ['Ishaan Chatterjee'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    // Nuts & Berries Co
    { brand: 'Nuts & Berries Co', process: 'Catalog', assignedEmployees: ['Aditya Kumar'], workingDays: [1, 2, 3, 4, 5], operatesOnPublicHolidays: false, minimumStaff: 1 },
    { brand: 'Nuts & Berries Co', process: 'CS', assignedEmployees: ['Yash Singhania'], workingDays: [1, 2, 3, 4, 5], operatesOnPublicHolidays: false, minimumStaff: 1 },
    // Kaveri Pottery
    { brand: 'Kaveri Pottery', process: 'CS', assignedEmployees: ['Kavita Rao'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    { brand: 'Kaveri Pottery', process: 'ACC', assignedEmployees: ['Kritika Pandey'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    // Zenith Footwear
    { brand: 'Zenith Footwear', process: 'NDR', assignedEmployees: ['Pranav Hegde'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    { brand: 'Zenith Footwear', process: 'CS', assignedEmployees: ['Manikandan Raman'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    // Urban Dhaga
    { brand: 'Urban Dhaga', process: 'Escalations', assignedEmployees: ['Preeti Choudhury'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },
    { brand: 'Urban Dhaga', process: 'CS', assignedEmployees: ['Shreya Das'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 1 },

    // Multi-Resource Brands
    { brand: 'Bharat Bazaar', process: 'CS', assignedEmployees: ['Varun Reddy', 'Divya Pillai', 'Rohan Sen'], workingDays: [0, 1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: true, minimumStaff: 2 },
    { brand: 'Bharat Bazaar', process: 'ACC', assignedEmployees: ['Nikhil Saxena', 'Radhika Mittal'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: true, minimumStaff: 2 },
    { brand: 'Indus Techworks', process: 'Retention', assignedEmployees: ['Rohan Iyer', 'Sneha Nair'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 2 },
    { brand: 'Indus Techworks', process: 'Escalations', assignedEmployees: ['Amit Trivedi', 'Shilpa Kulkarni'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 2 },
    { brand: 'SpiceRoute Global', process: 'CS', assignedEmployees: ['Kunal Shah', 'Tanvi Kapoor', 'Siddharth Sen', 'Arjun Singh'], workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minimumStaff: 2 },
  ];

  for (const cfg of brandConfigs) {
    const brand = brands[cfg.brand];
    const proc = processes[cfg.process];

    await prisma.operatingRule.create({
      data: {
        brandId: brand.id,
        processId: proc.id,
        workingDays: cfg.workingDays,
        operatesOnPublicHolidays: cfg.operatesOnPublicHolidays,
      },
    });

    await prisma.coverageRequirement.create({
      data: {
        brandId: brand.id,
        processId: proc.id,
        minimumStaff: cfg.minimumStaff,
      },
    });

    for (const empName of cfg.assignedEmployees) {
      const emp = employees[empName];
      await prisma.assignment.create({
        data: {
          employeeId: emp.id,
          brandId: brand.id,
          processId: proc.id,
        },
      });
    }
  }

  // 6. Seed Public Holidays
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

  // 7. Seed Specific Approved Leaves and Comp-Offs in December 2026
  const leaveData = [
    {
      employee: 'Priya Patel',
      type: AvailabilityType.LEAVE,
      startDate: '2026-12-07T00:00:00.000Z',
      endDate: '2026-12-09T00:00:00.000Z',
      status: AvailabilityStatus.APPROVED,
      reason: 'Approved leave for family wedding (2026-12-07 through 2026-12-09 inclusive, 3 working days)',
    },
    {
      employee: 'Rohan Iyer',
      type: AvailabilityType.LEAVE,
      startDate: '2026-12-15T00:00:00.000Z',
      endDate: '2026-12-15T00:00:00.000Z',
      status: AvailabilityStatus.APPROVED,
      reason: 'Medical consultation (Trap 3: Combined with Sneha Nair Tue weekly-off)',
    },
    {
      employee: 'Kunal Shah',
      type: AvailabilityType.COMP_OFF,
      startDate: '2026-12-18T00:00:00.000Z',
      endDate: '2026-12-18T00:00:00.000Z',
      status: AvailabilityStatus.APPROVED,
      reason: 'Comp-off for server migration weekend support (Trap 6: Backup Siddharth Sen available)',
    },
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

  console.log('Seed completed successfully!');
}
