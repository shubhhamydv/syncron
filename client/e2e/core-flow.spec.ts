import { test, expect } from '@playwright/test';

test.describe('Smart Roster Management - End-to-End Core Flow', () => {
  test.beforeEach(async ({ request }) => {
    // 1. Clean up any leftover test availability
    const getAvailRes = await request.get('http://localhost:4000/api/availability');
    if (getAvailRes.ok()) {
      const availList = await getAvailRes.json();
      const testAvails = availList.filter((a: any) => a.reason === 'Personal family leave');
      for (const t of testAvails) {
        await request.delete(`http://localhost:4000/api/availability/${t.id}`);
      }
    }

    // 2. Generate clean baseline December 2026 roster in test database
    await request.post('http://localhost:4000/api/rosters/generate', {
      data: { month: 12, year: 2026 },
    });
  });

  test('executes core live flow: baseline -> approved leave (+1) -> replacement assignment (baseline)', async ({
    page,
    request,
  }) => {
    page.on('console', (msg) => console.log('[Browser Console]', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('[Browser Error]', err));

    // 1. Visit Monthly Roster Grid
    await page.goto('/roster?month=12&year=2026');
    await page.waitForLoadState('networkidle');

    // Assert baseline open conflicts is 34
    const publishBtn = page.getByRole('button', { name: /publish roster/i });
    await expect(publishBtn).toBeVisible({ timeout: 15000 });
    const publishText = await publishBtn.textContent();
    console.log('[E2E Observation] Publish button initial text:', publishText);
    expect(publishText).toContain('34');

    // 2. Navigate to Team & Pods
    await page.goto('/team');
    await page.waitForLoadState('networkidle');

    // Search for Arjun Singh
    const searchInput = page.getByPlaceholder(/search by employee name/i);
    await searchInput.fill('Arjun Singh');
    await page.waitForTimeout(500);

    // Click "Availability" on Arjun Singh's row
    const availBtn = page.getByRole('button', { name: /availability/i }).first();
    await availBtn.click();

    // In Availability drawer, click "Add Rule / Leave"
    const addRuleBtn = page.getByRole('button', { name: /add rule \/ leave/i });
    await addRuleBtn.click();

    // Fill form: Type = LEAVE, Status = APPROVED, Start = 2026-12-08, End = 2026-12-08, Reason = Personal family leave
    await page.locator('select').filter({ hasText: /LEAVE/i }).selectOption('LEAVE');
    await page.locator('select').filter({ hasText: /APPROVED/i }).selectOption('APPROVED');

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill('2026-12-08');
    await dateInputs.nth(1).fill('2026-12-08');

    await page.getByPlaceholder(/family wedding/i).fill('Personal family leave');

    // Submit availability
    const submitAvailBtn = page.getByRole('button', { name: /add availability/i });
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/availability') && r.request().method() === 'POST'),
      submitAvailBtn.click(),
    ]);
    const resJson = await res.json();
    console.log('[E2E Observation] Availability POST response:', res.status(), JSON.stringify(resJson));

    // Verify Toast notification: "1 conflict opened, 0 resolved"
    const toastMessage = page.locator('text=1 conflict opened, 0 resolved');
    await expect(toastMessage).toBeVisible({ timeout: 10000 });
    console.log('[E2E Observation] Observed Toast after leave: "1 conflict opened, 0 resolved"');

    // Close Availability drawer
    await page.getByRole('button', { name: /close/i }).last().click();

    // 3. Navigate to Conflict Center
    await page.goto('/conflicts?month=12&year=2026');
    await page.waitForLoadState('networkidle');

    // Assert Open Conflicts counter has increased from 34 to 35 (+1)
    const openTabBadge = page.locator('button:has-text("Open Issues") span').last();
    await expect(openTabBadge).toHaveText('35', { timeout: 10000 });
    console.log('[E2E Observation] Conflict Center open badge count after leave: 35');

    // Find Kashmir Looms row
    const kashmirRow = page.locator('tr:has-text("Kashmir Looms")').first();
    await expect(kashmirRow).toBeVisible();
    await expect(kashmirRow).toContainText('Coverage gap: 0 of 1 required staff allocated for Kashmir Looms CS');

    // Click to open Conflict Resolution Drawer
    await kashmirRow.click();

    // Verify candidate list has Siddharth Sen as Fairest Match
    const candRow = page.locator('text=Siddharth Sen');
    await expect(candRow).toBeVisible({ timeout: 10000 });
    console.log('[E2E Observation] Top candidate in drawer: Siddharth Sen');

    // Click "Assign" on candidate
    const assignBtn = page.getByRole('button', { name: /^assign$/i }).first();
    const [assignRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/assign')),
      assignBtn.click(),
    ]);
    const assignJson = await assignRes.json();
    console.log('[E2E Observation] Assign response:', assignRes.status(), JSON.stringify(assignJson));

    // Verify Toast reports 0 opened, 1 resolved
    const resolveToast = page.locator('text=0 conflicts opened, 1 resolved');
    await expect(resolveToast).toBeVisible({ timeout: 10000 });
    console.log('[E2E Observation] Observed Toast after assignment: "0 conflicts opened, 1 resolved"');

    // 4. Assert Conflict Center returns back to baseline (34)
    await expect(openTabBadge).toHaveText('34', { timeout: 10000 });
    console.log('[E2E Observation] Conflict Center open badge count restored to: 34');

    // 5. Navigate to Dashboard
    await page.goto('/dashboard?month=12&year=2026');
    await page.waitForLoadState('networkidle');
    const coverageText = page.locator('text=97.9%');
    await expect(coverageText).toBeVisible({ timeout: 10000 });
    console.log('[E2E Observation] Dashboard coverage restored to: 97.9%');

    // 6. Teardown: clean up test availability record
    const getAvailRes = await request.get('http://localhost:4000/api/availability');
    if (getAvailRes.ok()) {
      const availList = await getAvailRes.json();
      const testAvail = availList.find((a: any) => a.reason === 'Personal family leave');
      if (testAvail) {
        await request.delete(`http://localhost:4000/api/availability/${testAvail.id}`);
      }
    }
    await request.post('http://localhost:4000/api/rosters/generate', {
      data: { month: 12, year: 2026 },
    });
  });
});
