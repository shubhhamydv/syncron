import { Router } from 'express';
import employeeRoutes from './employeeRoutes';
import podRoutes from './podRoutes';
import brandRoutes from './brandRoutes';
import processRoutes from './processRoutes';
import assignmentRoutes from './assignmentRoutes';
import operatingRuleRoutes from './operatingRuleRoutes';
import coverageRequirementRoutes from './coverageRequirementRoutes';
import availabilityRoutes from './availabilityRoutes';
import publicHolidayRoutes from './publicHolidayRoutes';
import rosterRoutes from './rosterRoutes';
import conflictRoutes from './conflictRoutes';
import rosterEntryRoutes from './rosterEntryRoutes';
import dashboardRoutes from './dashboardRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'syncron-roster-api',
  });
});

// Resources
router.use('/employees', employeeRoutes);
router.use('/pods', podRoutes);
router.use('/brands', brandRoutes);
router.use('/processes', processRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/operating-rules', operatingRuleRoutes);
router.use('/coverage-requirements', coverageRequirementRoutes);
router.use('/availability', availabilityRoutes);
router.use('/public-holidays', publicHolidayRoutes);

// Rosters, Entries, Conflicts, Dashboard
router.use('/rosters', rosterRoutes);
router.use('/conflicts', conflictRoutes);
router.use('/roster-entries', rosterEntryRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/admin', adminRoutes);

export default router;
