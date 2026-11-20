/**
 * Database Seed Service.
 * Idempotent, production-runnable seed script aligned with the assessment specification.
 *
 * Topology:
 * - 25 Brands: 20 single-resource (80.0%), 5 multi-employee (20.0%).
 * - Single-resource brand: count of distinct employees across all assignments == 1.
 * - Multi-employee brand: 2-3 employees with at least one shared process requiring min staff 2.
 * - 34 Employees across 5 pods with designated leads.
 * - Test Traps: T1 (Kalyan Sunday gap), T2 (Zingy 3-day leave), T3 (Indus dual unavailability),
 *   T4 (Vikram Friday cross-brand overlap), T5 (Christmas holiday divergence),
 *   T6 (SpiceRoute 3-employee coverage preservation), T7 (Single-resource gap backups).
 * - Employee Preferences (soft constraints): 5 preferences seeded (some honored, some forced warnings).
 */

import {
  PrismaClient,
  EmployeeStatus,
  BrandStatus,
  AvailabilityType,
  AvailabilityStatus,
  PreferenceType,
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
  await prisma.employeePreference.deleteMany({});
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

  // 1. Seed Processes (6 processes)
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

  // 3. Seed 34 Employees across 5 pods
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
    { name: 'Gaurav Chopra', email: 'gaurav.chopra@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: false, weeklyOff: 0 },
    { name: 'Ritu Bhatia', email: 'ritu.bhatia@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: false, weeklyOff: 0 },
    { name: 'Ishaan Chatterjee', email: 'ishaan.chatterjee@datastraw.io', pod: 'Pod Gamma - Enterprise & Retention', isLead: false, weeklyOff: 0 },

    // Pod Delta (6 employees) - Lead: Vikram Malhotra
    { name: 'Vikram Malhotra', email: 'vikram.malhotra@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: true, weeklyOff: 0 },
    { name: 'Rahul Mehta', email: 'rahul.mehta@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 0 },
    { name: 'Pooja Gupta', email: 'pooja.gupta@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 0 },
    { name: 'Aditya Kumar', email: 'aditya.kumar@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 0 },
    { name: 'Kavita Rao', email: 'kavita.rao@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 0 },
    { name: 'Varun Reddy', email: 'varun.reddy@datastraw.io', pod: 'Pod Delta - High Volume Support', isLead: false, weeklyOff: 1 },

    // Pod Epsilon (6 employees) - Lead: Divya Pillai
    { name: 'Divya Pillai', email: 'divya.pillai@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: true, weeklyOff: 2 },
    { name: 'Pranav Hegde', email: 'pranav.hegde@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 0 },
    { name: 'Preeti Choudhury', email: 'preeti.choudhury@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 0 },
    { name: 'Yash Singhania', email: 'yash.singhania@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 0 },
    { name: 'Kritika Pandey', email: 'kritika.pandey@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 0 },
    { name: 'Manikandan Raman', email: 'manikandan.raman@datastraw.io', pod: 'Pod Epsilon - Operations & Logistics', isLead: false, weeklyOff: 0 },
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

  // 4. Seed Brands (25 brands: 20 single-resource, 5 multi-employee)
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
    'Saffron Valley',
    'Kashmir Looms',
    'Malabar Coast',
    'Nilgiri Teas',
    'Sundarban Honey',
    'Jaipur Rugs Co',
    'Ganges Herbals',
    'Deccan Crafts',
  ];

  const multiResourceBrandNames = [
    'Bharat Bazaar',
    'Indus Techworks',
    'SpiceRoute Global',
    'Western Ghats Logistics',
    'Eastern Express Cargo',
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

  // 5. Seed Operating Rules, Coverage Requirements, and Assignments
  // Single-Resource Brands: exactly ONE employee handles ALL of that brand's processes (1-3 processes)
  const singleResourceConfigs = [
    // T1: Kalyan Organics (Aarav Sharma handles CS 365-day and ACC Mon-Sat)
    { brand: 'Kalyan Organics', employee: 'Aarav Sharma', processes: [
      { process: 'CS', workingDays: [0, 1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
      { process: 'ACC', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // T2: Zingy Spices (Priya Patel handles CS and NDR Mon-Sat)
    { brand: 'Zingy Spices', employee: 'Priya Patel', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
      { process: 'NDR', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // T4: Veda Naturals & Desi Threads (Vikram Malhotra)
    { brand: 'Veda Naturals', employee: 'Vikram Malhotra', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    { brand: 'Desi Threads', employee: 'Vikram Malhotra', processes: [
      { process: 'CS', workingDays: [5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // ChaiMakers (Clean Core Demo Brand, Neha Joshi handles CS and ACC)
    { brand: 'ChaiMakers', employee: 'Neha Joshi', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
      { process: 'ACC', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // MithaiCraft (Gaurav Chopra)
    { brand: 'MithaiCraft', employee: 'Gaurav Chopra', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // Aura Ayurveda (Rahul Mehta)
    { brand: 'Aura Ayurveda', employee: 'Rahul Mehta', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
      { process: 'NDR', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // Himalayan Brews (Pooja Gupta)
    { brand: 'Himalayan Brews', employee: 'Pooja Gupta', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
      { process: 'Retention', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // Nuts & Berries Co (Aditya Kumar)
    { brand: 'Nuts & Berries Co', employee: 'Aditya Kumar', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5], operatesOnPublicHolidays: false, minStaff: 1 },
      { process: 'Catalog', workingDays: [1, 2, 3, 4, 5], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // Kaveri Pottery (Kavita Rao)
    { brand: 'Kaveri Pottery', employee: 'Kavita Rao', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
      { process: 'ACC', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // Zenith Footwear (Pranav Hegde)
    { brand: 'Zenith Footwear', employee: 'Pranav Hegde', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
      { process: 'NDR', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // Urban Dhaga (Preeti Choudhury)
    { brand: 'Urban Dhaga', employee: 'Preeti Choudhury', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
      { process: 'Escalations', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // Saffron Valley (Meera Nambiar)
    { brand: 'Saffron Valley', employee: 'Meera Nambiar', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
      { process: 'ACC', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // Kashmir Looms (Arjun Singh)
    { brand: 'Kashmir Looms', employee: 'Arjun Singh', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // Malabar Coast (Swati Deshmukh)
    { brand: 'Malabar Coast', employee: 'Swati Deshmukh', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
      { process: 'NDR', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // Nilgiri Teas (Yash Singhania)
    { brand: 'Nilgiri Teas', employee: 'Yash Singhania', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // Sundarban Honey (Devansh Mukherjee)
    { brand: 'Sundarban Honey', employee: 'Devansh Mukherjee', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
      { process: 'ACC', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // Jaipur Rugs Co (Shalini Menon)
    { brand: 'Jaipur Rugs Co', employee: 'Shalini Menon', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5], operatesOnPublicHolidays: false, minStaff: 1 },
      { process: 'Catalog', workingDays: [1, 2, 3, 4, 5], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // Ganges Herbals (Ritu Bhatia)
    { brand: 'Ganges Herbals', employee: 'Ritu Bhatia', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
      { process: 'NDR', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
    // Deccan Crafts (Ishaan Chatterjee)
    { brand: 'Deccan Crafts', employee: 'Ishaan Chatterjee', processes: [
      { process: 'CS', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
      { process: 'ACC', workingDays: [1, 2, 3, 4, 5, 6], operatesOnPublicHolidays: false, minStaff: 1 },
    ]},
  ];

  for (const cfg of singleResourceConfigs) {
    const brand = brands[cfg.brand];
    const emp = employees[cfg.employee];

    for (const p of cfg.processes) {
      const proc = processes[p.process];

      await prisma.operatingRule.create({
        data: {
          brandId: brand.id,
          processId: proc.id,
          workingDays: p.workingDays,
          operatesOnPublicHolidays: p.operatesOnPublicHolidays,
        },
      });

      await prisma.coverageRequirement.create({
        data: {
          brandId: brand.id,
          processId: proc.id,
          minimumStaff: p.minStaff,
        },
      });

      await prisma.assignment.create({
        data: {
          employeeId: emp.id,
          brandId: brand.id,
          processId: proc.id,
        },
      });
    }
  }

  // Multi-Employee Brands: 2-3 distinct employees, at least one shared process, minStaff 2
  const multiEmployeeConfigs = [
    // T5: Bharat Bazaar (3 employees, 365-day operation, operates on public holidays)
    {
      brand: 'Bharat Bazaar',
      process: 'CS',
      assignedEmployees: ['Varun Reddy', 'Divya Pillai', 'Rohan Sen'],
      workingDays: [0, 1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: true,
      minStaff: 2,
    },
    // T3: Indus Techworks (Retention shared minStaff 2, Escalations minStaff 1)
    {
      brand: 'Indus Techworks',
      process: 'Retention',
      assignedEmployees: ['Rohan Iyer', 'Sneha Nair'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minStaff: 2,
    },
    {
      brand: 'Indus Techworks',
      process: 'Escalations',
      assignedEmployees: ['Harsh Vardhan'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minStaff: 1,
    },
    // T6: SpiceRoute Global (3 employees, CS shared, minStaff 2)
    {
      brand: 'SpiceRoute Global',
      process: 'CS',
      assignedEmployees: ['Kunal Shah', 'Tanvi Kapoor', 'Siddharth Sen'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minStaff: 2,
    },
    // Western Ghats Logistics (3 employees, Escalations shared, minStaff 2)
    {
      brand: 'Western Ghats Logistics',
      process: 'Escalations',
      assignedEmployees: ['Nikhil Saxena', 'Radhika Mittal', 'Kritika Pandey'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minStaff: 2,
    },
    // Eastern Express Cargo (3 employees, NDR shared, minStaff 2)
    {
      brand: 'Eastern Express Cargo',
      process: 'NDR',
      assignedEmployees: ['Amit Trivedi', 'Shilpa Kulkarni', 'Manikandan Raman'],
      workingDays: [1, 2, 3, 4, 5, 6],
      operatesOnPublicHolidays: false,
      minStaff: 2,
    },
  ];

  for (const cfg of multiEmployeeConfigs) {
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
        minimumStaff: cfg.minStaff,
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

  // 6. Seed Public Holidays (Nov-Dec 2026)
  const holidays = [
    { date: '2026-11-01', name: 'Karnataka Rajyotsava' },
    { date: '2026-11-08', name: 'Diwali (Deepavali)' },
    { date: '2026-11-24', name: 'Guru Nanak Jayanti' },
    { date: '2026-12-25', name: 'Christmas Day' },
  ];

  for (const h of holidays) {
    await prisma.publicHoliday.create({
      data: {
        date: new Date(`${h.date}T00:00:00.000Z`),
        name: h.name,
        region: 'ALL',
      },
    });
  }

  // 7. Seed Planned Leaves & Comp-offs in December 2026
  const leaves = [
    // T2: Zingy Spices - Priya Patel 3-day approved leave (Dec 7-9 inclusive)
    {
      employee: 'Priya Patel',
      type: AvailabilityType.LEAVE,
      startDate: '2026-12-07',
      endDate: '2026-12-09',
      status: AvailabilityStatus.APPROVED,
      reason: 'Approved leave for family wedding (2026-12-07 through 2026-12-09 inclusive, 3 working days)',
    },
    // T3: Indus Techworks - Rohan Iyer approved leave on Tuesday Dec 15 (combines with Sneha Nair Tue off)
    {
      employee: 'Rohan Iyer',
      type: AvailabilityType.LEAVE,
      startDate: '2026-12-15',
      endDate: '2026-12-15',
      status: AvailabilityStatus.APPROVED,
      reason: 'Medical consultation (Trap 3: Combined with Sneha Nair Tue weekly-off)',
    },
    // T6: SpiceRoute Global - Tanvi Kapoor approved leave Dec 10-12 (coverage kept by Kunal & Siddharth)
    {
      employee: 'Tanvi Kapoor',
      type: AvailabilityType.LEAVE,
      startDate: '2026-12-10',
      endDate: '2026-12-12',
      status: AvailabilityStatus.APPROVED,
      reason: 'Pre-approved annual personal leave (Trap 6: Multi-resource backup demo)',
    },
    // MithaiCraft - Gaurav Chopra comp-off on Friday Dec 4
    {
      employee: 'Gaurav Chopra',
      type: AvailabilityType.COMP_OFF,
      startDate: '2026-12-04',
      endDate: '2026-12-04',
      status: AvailabilityStatus.APPROVED,
      reason: 'Earned comp-off for festive roster coverage',
    },
    // Saffron Valley - Meera Nambiar annual leave Dec 21-22
    {
      employee: 'Meera Nambiar',
      type: AvailabilityType.LEAVE,
      startDate: '2026-12-21',
      endDate: '2026-12-22',
      status: AvailabilityStatus.APPROVED,
      reason: 'Annual personal leave',
    },
  ];

  for (const l of leaves) {
    const emp = employees[l.employee];
    await prisma.employeeAvailability.create({
      data: {
        employeeId: emp.id,
        type: l.type,
        startDate: new Date(`${l.startDate}T00:00:00.000Z`),
        endDate: new Date(`${l.endDate}T00:00:00.000Z`),
        status: l.status,
        reason: l.reason,
      },
    });
  }

  // 8. Seed Employee Preferences (Soft Constraints)
  const preferences = [
    // Honored: Kunal Shah prefers Saturday off (SpiceRoute Global has surplus staff on Saturday)
    {
      employee: 'Kunal Shah',
      type: PreferenceType.PREFERRED_OFF_DAY,
      dayOfWeek: 6, // Saturday
      note: 'Prefers Saturdays off for family time',
    },
    // Honored: Varun Reddy prefers Friday off (Bharat Bazaar has Divya & Rohan to cover)
    {
      employee: 'Varun Reddy',
      type: PreferenceType.PREFERRED_OFF_DAY,
      dayOfWeek: 5, // Friday
      note: 'Prefers Friday off for weekend travel',
    },
    // Honored: Radhika Mittal prefers Monday off (Western Ghats Logistics has Nikhil & Kritika)
    {
      employee: 'Radhika Mittal',
      type: PreferenceType.PREFERRED_OFF_DAY,
      dayOfWeek: 1, // Monday
      note: 'Prefers Mondays off',
    },
    // Forced Violation (Warning): Neha Joshi prefers Thursday off, but is the sole resource for ChaiMakers
    {
      employee: 'Neha Joshi',
      type: PreferenceType.PREFERRED_OFF_DAY,
      dayOfWeek: 4, // Thursday
      note: 'Prefers Thursdays off for personal study',
    },
    // Forced Violation (Warning): Pooja Gupta prefers Wednesday off, but is the sole resource for Himalayan Brews
    {
      employee: 'Pooja Gupta',
      type: PreferenceType.PREFERRED_OFF_DAY,
      dayOfWeek: 3, // Wednesday
      note: 'Prefers Wednesdays off',
    },
  ];

  for (const pref of preferences) {
    const emp = employees[pref.employee];
    await prisma.employeePreference.create({
      data: {
        employeeId: emp.id,
        type: pref.type,
        dayOfWeek: pref.dayOfWeek,
        note: pref.note,
      },
    });
  }

  console.log('Seed completed successfully!');
}
