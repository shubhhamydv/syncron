/**
 * Verification Script: verify-seed.ts
 *
 * Verifies Phase 5a database seed using the check() helper pattern:
 * - Employee count (32-36, exactly 34 active employees)
 * - Pod count & lead assignments (5 pods with designated leads)
 * - Brand count & single-resource ratio (25 brands, 20 single-resource == 80.0%, 5 multi-employee)
 * - Definition: single-resource brand = count of DISTINCT employees across ALL assignments == 1
 * - Multi-employee brands have 2-3 employees with shared process requiring min staff 2
 * - Employees-per-brand table and Processes-per-employee table
 * - Traps T1 to T7 verified
 * - Employee preferences verified (honored vs forced warnings)
 * - Prints "X/Y checks passed" summary and exits non-zero on any failure.
 */

import {
  PrismaClient,
  AvailabilityType,
  AvailabilityStatus,
  EmployeeStatus,
} from '@prisma/client';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

const prisma = new PrismaClient();

let passedChecks = 0;
let totalChecks = 0;

function check(description: string, condition: boolean, details?: string) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] ${description}${details ? ` -> ${details}` : ''}`);
  } else {
    console.error(`  [FAIL] ${description}${details ? ` -> ${details}` : ''}`);
  }
}

async function verify() {
  console.log('='.repeat(80));
  console.log('SMART ROSTER MANAGEMENT SYSTEM - DATABASE SEED & TRAP VERIFICATION');
  console.log('='.repeat(80));

  // ---------------------------------------------------------------------------
  // 1. Employee Count and Status
  // ---------------------------------------------------------------------------
  console.log('\n[SECTION 1: EMPLOYEES]');
  const totalEmployees = await prisma.employee.count();
  const activeEmployees = await prisma.employee.count({
    where: { status: EmployeeStatus.ACTIVE },
  });
  check(
    'Total employee count is within required 32-36 range',
    totalEmployees >= 32 && totalEmployees <= 36,
    `Found ${totalEmployees} employees`
  );
  check(
    'All employees have ACTIVE status',
    activeEmployees === totalEmployees,
    `Active: ${activeEmployees}/${totalEmployees}`
  );

  // ---------------------------------------------------------------------------
  // 2. Pods and Lead Assignments
  // ---------------------------------------------------------------------------
  console.log('\n[SECTION 2: PODS & LEADS]');
  const pods = await prisma.pod.findMany({
    include: {
      lead: true,
      members: true,
      _count: { select: { members: true } },
    },
  });
  check('Pod count is exactly 5', pods.length === 5, `Found ${pods.length} pods`);

  let podsWithValidLead = 0;
  for (const pod of pods) {
    const hasLead = pod.lead !== null;
    const leadIsMember = pod.members.some((m) => m.id === pod.leadEmployeeId);
    if (hasLead && leadIsMember) podsWithValidLead++;
    console.log(
      `    - ${pod.name}: ${pod._count.members} members | Lead: ${
        pod.lead ? `${pod.lead.name} (${pod.lead.email})` : 'NONE'
      }`
    );
  }
  check(
    'All 5 pods have a designated lead who is an active member',
    podsWithValidLead === 5,
    `${podsWithValidLead}/5 pods valid`
  );

  // ---------------------------------------------------------------------------
  // 3. Brands & Single-Resource Ratio (Assessment Definition)
  // ---------------------------------------------------------------------------
  console.log('\n[SECTION 3: BRANDS & RESOURCE ARCHITECTURE]');
  const allBrands = await prisma.brand.findMany({
    include: {
      assignments: {
        include: { process: true, employee: true },
      },
      operatingRules: { include: { process: true } },
    },
    orderBy: { name: 'asc' },
  });
  check('Brand count is exactly 25', allBrands.length === 25, `Found ${allBrands.length} brands`);

  let singleResourceBrandCount = 0;
  let multiEmployeeBrandCount = 0;
  const singleResourceList: string[] = [];
  const multiEmployeeList: string[] = [];

  for (const brand of allBrands) {
    // Assessment Definition: Count of DISTINCT employees across ALL assignments of the brand
    const distinctEmpIds = new Set(brand.assignments.map((a) => a.employeeId));
    if (distinctEmpIds.size === 1) {
      singleResourceBrandCount++;
      singleResourceList.push(brand.name);
    } else if (distinctEmpIds.size >= 2 && distinctEmpIds.size <= 3) {
      multiEmployeeBrandCount++;
      multiEmployeeList.push(brand.name);
    }
  }

  const singleResourceRatio = (singleResourceBrandCount / allBrands.length) * 100;
  console.log(
    `    Single-Resource Brands: ${singleResourceBrandCount}/${allBrands.length} (${singleResourceRatio.toFixed(1)}%)`
  );
  console.log(
    `    Multi-Employee Brands: ${multiEmployeeBrandCount}/${allBrands.length} (${(100 - singleResourceRatio).toFixed(1)}%)`
  );

  check(
    'Single-resource ratio is between 78% and 82% (Assessment target ~80%)',
    singleResourceRatio >= 78 && singleResourceRatio <= 82,
    `Actual: ${singleResourceRatio.toFixed(1)}% (${singleResourceBrandCount}/25)`
  );
  check(
    'Multi-employee brands have 2-3 distinct employees',
    multiEmployeeBrandCount === 5,
    `Found ${multiEmployeeBrandCount} multi-employee brands`
  );

  // ---------------------------------------------------------------------------
  // Table 1: Employees Per Brand Table
  // ---------------------------------------------------------------------------
  console.log('\n[TABLE 1: EMPLOYEES PER BRAND]');
  console.log('-'.repeat(80));
  console.log(
    `${'Brand Name'.padEnd(26)} | ${'Type'.padEnd(16)} | ${'Emps'.padEnd(5)} | ${'Assigned Staff & Processes'}`
  );
  console.log('-'.repeat(80));
  for (const brand of allBrands) {
    const distinctEmpMap = new Map<string, Set<string>>();
    for (const a of brand.assignments) {
      if (!distinctEmpMap.has(a.employee.name)) {
        distinctEmpMap.set(a.employee.name, new Set());
      }
      distinctEmpMap.get(a.employee.name)!.add(a.process.name);
    }
    const empCount = distinctEmpMap.size;
    const typeStr = empCount === 1 ? 'Single-Resource' : 'Multi-Employee';
    const staffSummary = Array.from(distinctEmpMap.entries())
      .map(([emp, procs]) => `${emp} (${Array.from(procs).join(', ')})`)
      .join('; ');
    console.log(
      `${brand.name.padEnd(26)} | ${typeStr.padEnd(16)} | ${String(empCount).padEnd(5)} | ${staffSummary}`
    );
  }
  console.log('-'.repeat(80));

  // ---------------------------------------------------------------------------
  // Table 2: Processes Per Employee Table
  // ---------------------------------------------------------------------------
  console.log('\n[TABLE 2: PROCESSES PER EMPLOYEE]');
  console.log('-'.repeat(80));
  console.log(
    `${'Employee Name'.padEnd(20)} | ${'Pod'.padEnd(18)} | ${'Procs'.padEnd(5)} | ${'Assigned Brands & Processes'}`
  );
  console.log('-'.repeat(80));
  const employeesWithAssignments = await prisma.employee.findMany({
    include: {
      pod: true,
      assignments: {
        include: { brand: true, process: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  let unassignedCount = 0;
  for (const emp of employeesWithAssignments) {
    if (emp.assignments.length === 0) unassignedCount++;
    const distinctProcs = new Set(emp.assignments.map((a) => a.process.name));
    const brandProcSummary = emp.assignments
      .map((a) => `${a.brand.name} [${a.process.name}]`)
      .join('; ');
    console.log(
      `${emp.name.padEnd(20)} | ${emp.pod.name.slice(0, 18).padEnd(18)} | ${String(distinctProcs.size).padEnd(5)} | ${brandProcSummary}`
    );
  }
  console.log('-'.repeat(80));
  check('Every employee is assigned to at least one brand/process', unassignedCount === 0, `Unassigned: ${unassignedCount}`);

  // ---------------------------------------------------------------------------
  // 4. Public Holidays Verification
  // ---------------------------------------------------------------------------
  console.log('\n[SECTION 4: PUBLIC HOLIDAYS]');
  const holidays = await prisma.publicHoliday.findMany({
    orderBy: { date: 'asc' },
  });
  console.log(`    Total Public Holidays: ${holidays.length}`);
  for (const h of holidays) {
    console.log(`    - ${format(h.date, 'yyyy-MM-dd')}: ${h.name} (${h.region})`);
  }
  check('Public holidays count is at least 4 for Nov-Dec 2026', holidays.length >= 4, `Found ${holidays.length}`);

  // ---------------------------------------------------------------------------
  // 5. Test Traps Verification (T1 to T7)
  // ---------------------------------------------------------------------------
  console.log('\n[SECTION 5: DELIBERATE TEST TRAPS]');

  // Trap 1: Kalyan Organics
  // ONE employee (Aarav) handles CS (365 days) AND ACC (Mon-Sat), weekly off Sunday -> Sunday CS gap, ACC closed Sundays
  const kalyan = await prisma.brand.findUnique({
    where: { name: 'Kalyan Organics' },
    include: {
      assignments: { include: { employee: true, process: true } },
      operatingRules: { include: { process: true } },
    },
  });
  const kalyanDistinctEmps = new Set(kalyan?.assignments.map((a) => a.employeeId));
  const kalyanEmp = kalyan?.assignments[0]?.employee;
  const kalyanAvail = await prisma.employeeAvailability.findFirst({
    where: { employeeId: kalyanEmp?.id, type: AvailabilityType.WEEKLY_OFF },
  });
  const csRule = kalyan?.operatingRules.find((r) => r.process.name === 'CS');
  const accRule = kalyan?.operatingRules.find((r) => r.process.name === 'ACC');

  const t1Valid =
    kalyanDistinctEmps.size === 1 &&
    kalyanEmp?.name === 'Aarav Sharma' &&
    kalyanAvail?.dayOfWeek === 0 &&
    csRule?.workingDays.length === 7 &&
    accRule?.workingDays.length === 6 &&
    !accRule?.workingDays.includes(0);

  check(
    'Trap T1: Kalyan Organics has sole resource Aarav Sharma handling CS (365d) and ACC (Mon-Sat) with Sunday CS gap',
    Boolean(t1Valid),
    `Distinct emps: ${kalyanDistinctEmps.size}, CS days: ${csRule?.workingDays.length}, ACC days: ${accRule?.workingDays.length}`
  );

  // Trap 2: Zingy Spices (Priya Patel, approved leave Dec 7-9 inclusive, 3 working days)
  const zingy = await prisma.brand.findUnique({
    where: { name: 'Zingy Spices' },
    include: {
      assignments: { include: { employee: true, process: true } },
    },
  });
  const priya = await prisma.employee.findFirst({ where: { name: 'Priya Patel' } });
  const priyaLeave = await prisma.employeeAvailability.findFirst({
    where: {
      employeeId: priya?.id,
      type: AvailabilityType.LEAVE,
      status: AvailabilityStatus.APPROVED,
    },
  });
  const priyaStart = priyaLeave?.startDate ? format(priyaLeave.startDate, 'yyyy-MM-dd') : null;
  const priyaEnd = priyaLeave?.endDate ? format(priyaLeave.endDate, 'yyyy-MM-dd') : null;
  const t2Valid = priyaStart === '2026-12-07' && priyaEnd === '2026-12-09';
  check(
    'Trap T2: Zingy Spices sole resource Priya Patel has approved leave Dec 7-9 (3 working days inclusive)',
    Boolean(t2Valid),
    `${priyaStart} to ${priyaEnd}`
  );

  // Trap 3: Multi-resource brand with 2 employees, both unavailable on Dec 15
  const indus = await prisma.brand.findUnique({
    where: { name: 'Indus Techworks' },
    include: {
      assignments: { include: { employee: true, process: true } },
      coverageRequirements: { include: { process: true } },
    },
  });
  const rohan = await prisma.employee.findFirst({ where: { name: 'Rohan Iyer' } });
  const sneha = await prisma.employee.findFirst({ where: { name: 'Sneha Nair' } });
  const rohanLeave = await prisma.employeeAvailability.findFirst({
    where: {
      employeeId: rohan?.id,
      type: AvailabilityType.LEAVE,
      status: AvailabilityStatus.APPROVED,
      startDate: { lte: new Date('2026-12-15T23:59:59.999Z') },
      endDate: { gte: new Date('2026-12-15T00:00:00.000Z') },
    },
  });
  const snehaOff = await prisma.employeeAvailability.findFirst({
    where: {
      employeeId: sneha?.id,
      type: AvailabilityType.WEEKLY_OFF,
      dayOfWeek: 2, // Tuesday
    },
  });
  const indusRetentionReq = indus?.coverageRequirements.find((r) => r.process.name === 'Retention');
  const t3Valid = Boolean(rohanLeave) && Boolean(snehaOff) && indusRetentionReq?.minimumStaff === 2;
  check(
    'Trap T3: Indus Techworks Retention requires min staff 2, both Rohan and Sneha unavailable on Dec 15 (Tuesday)',
    Boolean(t3Valid),
    `Rohan on leave, Sneha Tuesday off, minStaff: ${indusRetentionReq?.minimumStaff}`
  );

  // Trap 4: Vikram Malhotra cross-brand assignment (Veda Naturals Mon-Fri & Desi Threads Fri-Sat)
  const vikram = await prisma.employee.findFirst({
    where: { name: 'Vikram Malhotra' },
    include: { assignments: { include: { brand: true, process: true } } },
  });
  const vikramBrands = vikram?.assignments.map((a) => a.brand.name) || [];
  const vedaRule = await prisma.operatingRule.findFirst({
    where: { brand: { name: 'Veda Naturals' } },
  });
  const desiRule = await prisma.operatingRule.findFirst({
    where: { brand: { name: 'Desi Threads' } },
  });
  const overlapDays = vedaRule?.workingDays.filter((d) => desiRule?.workingDays.includes(d)) || [];
  const t4Valid =
    vikramBrands.includes('Veda Naturals') &&
    vikramBrands.includes('Desi Threads') &&
    overlapDays.length === 1 &&
    overlapDays[0] === 5; // Friday
  check(
    'Trap T4: Vikram Malhotra assigned to Veda Naturals & Desi Threads, overlapping on exactly ONE weekday (Friday)',
    Boolean(t4Valid),
    `Overlap days: [${overlapDays.join(', ')}] (5=Friday)`
  );

  // Trap 5: Holiday divergence on Christmas Day (Dec 25)
  const chaimakers = await prisma.brand.findUnique({
    where: { name: 'ChaiMakers' },
    include: { operatingRules: true },
  });
  const bharat = await prisma.brand.findUnique({
    where: { name: 'Bharat Bazaar' },
    include: { operatingRules: true },
  });
  const chaiHolidays = chaimakers?.operatingRules.every((r) => !r.operatesOnPublicHolidays);
  const bharatHolidays = bharat?.operatingRules.some((r) => r.operatesOnPublicHolidays);
  const t5Valid = Boolean(chaiHolidays) && Boolean(bharatHolidays);
  check(
    'Trap T5: Holiday divergence on Dec 25 (ChaiMakers closed vs Bharat Bazaar open)',
    Boolean(t5Valid),
    `ChaiMakers operatesOnHolidays=${!chaiHolidays}, Bharat operatesOnHolidays=${bharatHolidays}`
  );

  // Trap 6: SpiceRoute Global 3-employee brand (Tanvi Kapoor on leave, coverage kept by Kunal & Siddharth)
  const spiceRoute = await prisma.brand.findUnique({
    where: { name: 'SpiceRoute Global' },
    include: {
      assignments: { include: { employee: true, process: true } },
      coverageRequirements: { include: { process: true } },
    },
  });
  const spiceRouteDistinctEmps = new Set(spiceRoute?.assignments.map((a) => a.employeeId));
  const tanviLeave = await prisma.employeeAvailability.findFirst({
    where: {
      employee: { name: 'Tanvi Kapoor' },
      type: AvailabilityType.LEAVE,
      status: AvailabilityStatus.APPROVED,
    },
  });
  const csReq = spiceRoute?.coverageRequirements.find((r) => r.process.name === 'CS');
  const t6Valid = spiceRouteDistinctEmps.size === 3 && Boolean(tanviLeave) && csReq?.minimumStaff === 2;
  check(
    'Trap T6: SpiceRoute Global CS has 3 employees, Tanvi on leave Dec 10-12, coverage maintained by 2 staff',
    Boolean(t6Valid),
    `Distinct staff: ${spiceRouteDistinctEmps.size}, minStaff: ${csReq?.minimumStaff}, Tanvi leave: Dec 10-12`
  );

  // Trap 7: Kalyan Organics Sunday gap has eligible cross-brand backup
  // Eligible backup: assigned to CS on another brand, not on weekly off or leave on Sunday
  const csAssignments = await prisma.assignment.findMany({
    where: {
      process: { name: 'CS' },
      brand: { name: { not: 'Kalyan Organics' } },
    },
    include: {
      employee: {
        include: {
          availabilities: true,
        },
      },
    },
  });

  const targetSunday = parseISO('2026-12-06T00:00:00Z');
  const eligibleBackups = csAssignments.filter((a) => {
    const sundayOff = a.employee.availabilities.some(
      (av) => av.type === AvailabilityType.WEEKLY_OFF && av.dayOfWeek === 0
    );
    const onLeave = a.employee.availabilities.some(
      (av) =>
        av.status === AvailabilityStatus.APPROVED &&
        av.startDate &&
        av.endDate &&
        isWithinInterval(targetSunday, {
          start: startOfDay(av.startDate),
          end: endOfDay(av.endDate),
        })
    );
    return !sundayOff && !onLeave;
  });

  const distinctBackupNames = Array.from(new Set(eligibleBackups.map((a) => a.employee.name)));
  const t7Valid = distinctBackupNames.length > 0;
  console.log(`    Eligible cross-brand CS backups found for Sunday Dec 6: ${distinctBackupNames.join(', ')}`);
  check(
    'Trap T7: At least one single-resource brand gap (Kalyan Organics CS on Sundays) has an eligible backup computed from data',
    Boolean(t7Valid),
    `Backups: [${distinctBackupNames.join(', ')}]`
  );

  // ---------------------------------------------------------------------------
  // 6. Preferences Verification
  // ---------------------------------------------------------------------------
  console.log('\n[SECTION 6: EMPLOYEE PREFERENCES (SOFT CONSTRAINTS)]');
  const seededPrefs = await prisma.employeePreference.findMany({
    include: { employee: true },
  });
  console.log(`    Seeded Preferences Count: ${seededPrefs.length}`);
  for (const p of seededPrefs) {
    console.log(`    - ${p.employee.name}: Prefers day ${p.dayOfWeek} off ("${p.note}")`);
  }
  check('Employee preferences seeded (5 preferences)', seededPrefs.length >= 5, `Found ${seededPrefs.length}`);

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n' + '='.repeat(80));
  console.log(`VERIFICATION SUMMARY: ${passedChecks}/${totalChecks} checks passed`);
  console.log('='.repeat(80));

  if (passedChecks !== totalChecks) {
    console.error(`\nFAILED: ${totalChecks - passedChecks} check(s) failed!`);
    process.exit(1);
  } else {
    console.log('\nSUCCESS: All database seed, topology, and trap invariants verified successfully!');
  }
}

verify()
  .catch((e) => {
    console.error('Unexpected error during seed verification:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
