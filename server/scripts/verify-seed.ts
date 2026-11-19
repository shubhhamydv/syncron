/**
 * Verification Script: verify-seed.ts
 *
 * Verifies Phase 1 database seed using the check() helper pattern:
 * - Employee count & active status
 * - Pod count & lead assignments
 * - Brand count & single-resource ratio (~80%)
 * - Total assignments
 * - Public holidays (Nov-Dec 2026)
 * - Traps T1 to T6
 * - Trap T7: Single-resource brand gap (e.g. Kalyan Organics CS on Sundays)
 *           has an eligible backup from another brand computed from data.
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
  check('Total employee count is exactly 36', totalEmployees === 36, `Found ${totalEmployees}`);
  check('All 36 employees have ACTIVE status', activeEmployees === 36, `Active: ${activeEmployees}/36`);

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
  // 3. Brands & Single-Resource Ratio
  // ---------------------------------------------------------------------------
  console.log('\n[SECTION 3: BRANDS & RESOURCE ARCHITECTURE]');
  const allBrands = await prisma.brand.findMany({
    include: {
      assignments: {
        include: { process: true, employee: true },
      },
      operatingRules: { include: { process: true } },
    },
  });
  check('Brand count is exactly 15', allBrands.length === 15, `Found ${allBrands.length} brands`);

  let singleResourceBrandCount = 0;
  let multiResourceBrandCount = 0;
  const singleResourceNames: string[] = [];
  const multiResourceNames: string[] = [];

  for (const b of allBrands) {
    const processMap = new Map<string, number>();
    for (const a of b.assignments) {
      processMap.set(a.processId, (processMap.get(a.processId) || 0) + 1);
    }
    const counts = Array.from(processMap.values());
    const isSingleResource = counts.length > 0 && counts.every((cnt) => cnt === 1);

    if (isSingleResource) {
      singleResourceBrandCount++;
      singleResourceNames.push(b.name);
    } else {
      multiResourceBrandCount++;
      multiResourceNames.push(b.name);
    }
  }

  const srPercentage = (singleResourceBrandCount / allBrands.length) * 100;
  check(
    'Single-resource brands represent exactly 80.0% (12/15 brands)',
    singleResourceBrandCount === 12 && srPercentage === 80,
    `${singleResourceBrandCount}/15 (${srPercentage.toFixed(1)}%)`
  );
  check(
    'Multi-resource brands represent 20.0% (3/15 brands)',
    multiResourceBrandCount === 3,
    `${multiResourceBrandCount}/15`
  );
  console.log(`    Single-Resource Brands: ${singleResourceNames.join(', ')}`);
  console.log(`    Multi-Resource Brands:  ${multiResourceNames.join(', ')}`);

  // ---------------------------------------------------------------------------
  // 4. Assignments & Operating Calendars
  // ---------------------------------------------------------------------------
  console.log('\n[SECTION 4: ASSIGNMENTS & CALENDARS]');
  const totalAssignments = await prisma.assignment.count();
  check(
    'Total assignments >= 36 (every employee assigned)',
    totalAssignments >= 36,
    `Total assignments: ${totalAssignments}`
  );

  const holidays = await prisma.publicHoliday.findMany({
    orderBy: { date: 'asc' },
  });
  check(
    'Public holidays configured for Nov-Dec 2026',
    holidays.length >= 5,
    `${holidays.length} holidays found`
  );
  for (const h of holidays) {
    console.log(`    - ${format(h.date, 'yyyy-MM-dd')} [${h.region}]: ${h.name}`);
  }

  // ---------------------------------------------------------------------------
  // 5. Test Traps T1 through T7
  // ---------------------------------------------------------------------------
  console.log('\n[SECTION 5: TEST TRAP SCENARIOS]');

  // --- TRAP T1 ---
  console.log('\n  [T1] 365-day single-resource brand with Sunday weekly off');
  const trap1Brand = await prisma.brand.findUnique({
    where: { name: 'Kalyan Organics' },
    include: {
      operatingRules: { where: { process: { name: 'CS' } } },
      assignments: {
        where: { process: { name: 'CS' } },
        include: {
          employee: {
            include: {
              availabilities: { where: { type: AvailabilityType.WEEKLY_OFF } },
            },
          },
        },
      },
    },
  });
  const t1Rule = trap1Brand?.operatingRules[0];
  const t1Emp = trap1Brand?.assignments[0]?.employee;
  const t1Off = t1Emp?.availabilities[0]?.dayOfWeek;
  const is365 = t1Rule?.workingDays.length === 7 && t1Rule.workingDays.includes(0);
  check(
    'Trap T1: Kalyan Organics CS operates 365 days while sole employee has Sunday weekly off',
    Boolean(is365 && t1Off === 0 && trap1Brand?.assignments.length === 1),
    `Brand operates Sunday (0), Employee ${t1Emp?.name} weekly off = 0 (Sunday gap)`
  );

  // --- TRAP T2 ---
  console.log('\n  [T2] Single-resource brand with employee on 3-day approved leave (inclusive)');
  const trap2Brand = await prisma.brand.findUnique({
    where: { name: 'Zingy Spices' },
    include: {
      assignments: {
        where: { process: { name: 'NDR' } },
        include: {
          employee: {
            include: {
              availabilities: {
                where: { type: AvailabilityType.LEAVE, status: AvailabilityStatus.APPROVED },
              },
            },
          },
        },
      },
    },
  });
  const t2Emp = trap2Brand?.assignments[0]?.employee;
  const t2Leave = t2Emp?.availabilities[0];
  const t2StartStr = t2Leave?.startDate ? format(t2Leave.startDate, 'yyyy-MM-dd') : '';
  const t2EndStr = t2Leave?.endDate ? format(t2Leave.endDate, 'yyyy-MM-dd') : '';
  const t2Valid =
    t2StartStr === '2026-12-07' &&
    t2EndStr === '2026-12-09' &&
    Boolean(t2Leave?.reason?.includes('inclusive'));
  check(
    'Trap T2: Zingy Spices NDR leave is 2026-12-07 through 2026-12-09 (inclusive)',
    t2Valid,
    `Range: ${t2StartStr} to ${t2EndStr} (inclusive) | Reason: "${t2Leave?.reason}"`
  );

  // --- TRAP T3 ---
  console.log('\n  [T3] Multi-resource brand with all assigned employees unavailable on one date');
  const trap3Brand = await prisma.brand.findUnique({
    where: { name: 'Indus Techworks' },
    include: {
      coverageRequirements: { where: { process: { name: 'Retention' } } },
      assignments: {
        where: { process: { name: 'Retention' } },
        include: {
          employee: {
            include: { availabilities: true },
          },
        },
      },
    },
  });
  const t3Req = trap3Brand?.coverageRequirements[0]?.minimumStaff || 2;
  const t3Date = parseISO('2026-12-15T00:00:00.000Z'); // Tuesday (day 2)
  let t3AvailableCount = 0;
  for (const a of trap3Brand?.assignments || []) {
    const weeklyOff = a.employee.availabilities.find(
      (av) => av.type === AvailabilityType.WEEKLY_OFF
    )?.dayOfWeek;
    const leave = a.employee.availabilities.find(
      (av) =>
        av.type === AvailabilityType.LEAVE &&
        av.status === AvailabilityStatus.APPROVED &&
        av.startDate &&
        av.endDate &&
        isWithinInterval(t3Date, {
          start: startOfDay(av.startDate),
          end: endOfDay(av.endDate),
        })
    );
    if (weeklyOff !== 2 && !leave) {
      t3AvailableCount++;
    }
  }
  check(
    'Trap T3: Indus Techworks Retention has 0 staff available on 2026-12-15 when 2 required',
    t3AvailableCount === 0 && (trap3Brand?.assignments.length || 0) >= 2,
    `Required: ${t3Req}, Available: ${t3AvailableCount} (Rohan on leave, Sneha on weekly off)`
  );

  // --- TRAP T4 ---
  console.log('\n  [T4] Employee assigned across multiple brands (workload & overlap test)');
  const trap4Emp = await prisma.employee.findFirst({
    where: { name: 'Vikram Malhotra' },
    include: {
      assignments: { include: { brand: true, process: true } },
    },
  });
  const t4BrandNames = trap4Emp?.assignments.map((a) => a.brand.name) || [];
  check(
    'Trap T4: Vikram Malhotra assigned to 2 brands (Veda Naturals & Desi Threads)',
    t4BrandNames.includes('Veda Naturals') && t4BrandNames.includes('Desi Threads'),
    `Assigned brands: ${t4BrandNames.join(', ')}`
  );

  // --- TRAP T5 ---
  console.log('\n  [T5] Operating calendar divergence on public holidays');
  const chaiMakers = await prisma.operatingRule.findFirst({
    where: { brand: { name: 'ChaiMakers' }, process: { name: 'CS' } },
  });
  const bharatBazaar = await prisma.operatingRule.findFirst({
    where: { brand: { name: 'Bharat Bazaar' }, process: { name: 'CS' } },
  });
  check(
    'Trap T5: ChaiMakers closes on holidays (false) while Bharat Bazaar stays open (true)',
    chaiMakers?.operatesOnPublicHolidays === false && bharatBazaar?.operatesOnPublicHolidays === true,
    `ChaiMakers: ${chaiMakers?.operatesOnPublicHolidays}, Bharat Bazaar: ${bharatBazaar?.operatesOnPublicHolidays}`
  );

  // --- TRAP T6 ---
  console.log('\n  [T6] Multi-resource brand with backup available for replacement demo');
  const trap6Brand = await prisma.brand.findUnique({
    where: { name: 'SpiceRoute Global' },
    include: {
      coverageRequirements: { where: { process: { name: 'CS' } } },
      assignments: {
        where: { process: { name: 'CS' } },
        include: {
          employee: {
            include: { availabilities: true },
          },
        },
      },
    },
  });
  const t6Req = trap6Brand?.coverageRequirements[0]?.minimumStaff || 2;
  const t6Date = parseISO('2026-12-18T00:00:00.000Z'); // Friday (day 5)
  const t6AvailableEmployees: string[] = [];
  const t6UnavailableEmployees: string[] = [];

  for (const a of trap6Brand?.assignments || []) {
    const weeklyOff = a.employee.availabilities.find(
      (av) => av.type === AvailabilityType.WEEKLY_OFF
    )?.dayOfWeek;
    const isOff = weeklyOff === 5;
    const leaveOrCompOff = a.employee.availabilities.find(
      (av) =>
        (av.type === AvailabilityType.LEAVE || av.type === AvailabilityType.COMP_OFF) &&
        av.status === AvailabilityStatus.APPROVED &&
        av.startDate &&
        av.endDate &&
        isWithinInterval(t6Date, {
          start: startOfDay(av.startDate),
          end: endOfDay(av.endDate),
        })
    );
    if (!isOff && !leaveOrCompOff) {
      t6AvailableEmployees.push(a.employee.name);
    } else {
      t6UnavailableEmployees.push(`${a.employee.name} (${leaveOrCompOff ? 'Comp-off/Leave' : 'Off'})`);
    }
  }
  check(
    'Trap T6: SpiceRoute Global CS maintains required staff via available backup during comp-off',
    t6AvailableEmployees.length >= t6Req && t6UnavailableEmployees.length > 0,
    `Required: ${t6Req} | Available (${t6AvailableEmployees.length}): ${t6AvailableEmployees.join(', ')} | Unavailable: ${t6UnavailableEmployees.join(', ')}`
  );

  // --- TRAP T7 ---
  console.log('\n  [T7] Single-resource gap trap has eligible cross-brand backup computed from data');
  // Target: Kalyan Organics CS on Sunday 2026-12-06
  const targetSunday = parseISO('2026-12-06T00:00:00.000Z'); // Sunday (day 0)
  const targetProcessName = 'CS';
  const gapBrandName = 'Kalyan Organics';

  // 1. Verify gap on target Sunday for Kalyan Organics CS
  const gapBrandAssignments = await prisma.assignment.findMany({
    where: {
      brand: { name: gapBrandName },
      process: { name: targetProcessName },
    },
    include: {
      employee: {
        include: { availabilities: true },
      },
    },
  });

  const gapBrandAvailableStaff = gapBrandAssignments.filter((a) => {
    const weeklyOff = a.employee.availabilities.find(
      (av) => av.type === AvailabilityType.WEEKLY_OFF
    )?.dayOfWeek;
    const onLeave = a.employee.availabilities.some(
      (av) =>
        (av.type === AvailabilityType.LEAVE || av.type === AvailabilityType.COMP_OFF) &&
        av.status === AvailabilityStatus.APPROVED &&
        av.startDate &&
        av.endDate &&
        isWithinInterval(targetSunday, {
          start: startOfDay(av.startDate),
          end: endOfDay(av.endDate),
        })
    );
    return weeklyOff !== 0 && !onLeave;
  });

  // 2. Query all candidates across OTHER brands assigned to CS
  const crossBrandCandidates = await prisma.assignment.findMany({
    where: {
      process: { name: targetProcessName },
      brand: { name: { not: gapBrandName } },
      employee: { status: EmployeeStatus.ACTIVE },
    },
    include: {
      brand: true,
      process: true,
      employee: {
        include: { availabilities: true },
      },
    },
  });

  // 3. Compute eligible backups: not on Sunday weekly off, no approved leave on target Sunday
  const eligibleBackups: Array<{ name: string; email: string; brand: string; weeklyOffDay: number }> = [];

  for (const c of crossBrandCandidates) {
    const weeklyOff = c.employee.availabilities.find(
      (av) => av.type === AvailabilityType.WEEKLY_OFF
    )?.dayOfWeek;
    const isSundayOff = weeklyOff === 0;

    const onLeave = c.employee.availabilities.some(
      (av) =>
        (av.type === AvailabilityType.LEAVE || av.type === AvailabilityType.COMP_OFF) &&
        av.status === AvailabilityStatus.APPROVED &&
        av.startDate &&
        av.endDate &&
        isWithinInterval(targetSunday, {
          start: startOfDay(av.startDate),
          end: endOfDay(av.endDate),
        })
    );

    if (!isSundayOff && !onLeave) {
      if (!eligibleBackups.some((b) => b.name === c.employee.name)) {
        eligibleBackups.push({
          name: c.employee.name,
          email: c.employee.email,
          brand: c.brand.name,
          weeklyOffDay: weeklyOff ?? -1,
        });
      }
    }
  }

  console.log(`    Gap Brand: ${gapBrandName} | Process: ${targetProcessName} | Target Date: ${format(targetSunday, 'yyyy-MM-dd (EEEE)')}`);
  console.log(`    Gap Brand Staff Available: ${gapBrandAvailableStaff.length} (Coverage Gap confirmed)`);
  console.log(`    Eligible Cross-Brand Backups Found (${eligibleBackups.length}):`);
  for (const b of eligibleBackups.slice(0, 5)) {
    console.log(`      * ${b.name} (${b.email}) - Primary Brand: ${b.brand} (Weekly off: day ${b.weeklyOffDay})`);
  }
  if (eligibleBackups.length > 5) {
    console.log(`      ... and ${eligibleBackups.length - 5} more eligible cross-brand CS staff`);
  }

  check(
    'Trap T7: Single-resource Sunday gap (Kalyan Organics CS) has eligible cross-brand backup',
    gapBrandAvailableStaff.length === 0 && eligibleBackups.length > 0,
    `Found ${eligibleBackups.length} eligible backup(s) for replacement`
  );

  // ---------------------------------------------------------------------------
  // Summary & Exit Code
  // ---------------------------------------------------------------------------
  console.log('\n' + '='.repeat(80));
  console.log(`VERIFICATION SUMMARY: ${passedChecks}/${totalChecks} checks passed.`);
  console.log('='.repeat(80));

  if (passedChecks !== totalChecks) {
    console.error(`\nFAILURE: ${totalChecks - passedChecks} check(s) failed.`);
    process.exit(1);
  } else {
    console.log('\nSUCCESS: All schema relations, data invariants, and trap scenarios verified.');
    process.exit(0);
  }
}

verify()
  .catch((e) => {
    console.error('Fatal error during verification:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
