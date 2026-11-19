import { z } from 'zod';

export const createEmployeeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    podId: z.string().min(1, 'podId is required'),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const updateEmployeeSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    podId: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const createPodSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Pod name is required'),
    leadEmployeeId: z.string().nullable().optional(),
  }),
});

export const updatePodSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    name: z.string().min(1).optional(),
    leadEmployeeId: z.string().nullable().optional(),
  }),
});

export const createBrandSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Brand name is required'),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const updateBrandSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    name: z.string().min(1).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  }),
});

export const createProcessSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Process name is required'),
  }),
});

export const createAssignmentSchema = z.object({
  body: z.object({
    employeeId: z.string().min(1),
    brandId: z.string().min(1),
    processId: z.string().min(1),
  }),
});

export const createOperatingRuleSchema = z.object({
  body: z.object({
    brandId: z.string().min(1),
    processId: z.string().min(1),
    workingDays: z.array(z.number().int().min(0).max(6)).min(1, 'At least 1 working day required'),
    operatesOnPublicHolidays: z.boolean().optional(),
  }),
});

export const updateOperatingRuleSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    workingDays: z.array(z.number().int().min(0).max(6)).optional(),
    operatesOnPublicHolidays: z.boolean().optional(),
  }),
});

export const createCoverageRequirementSchema = z.object({
  body: z.object({
    brandId: z.string().min(1),
    processId: z.string().min(1),
    minimumStaff: z.number().int().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').nullable().optional(),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  }),
});

export const updateCoverageRequirementSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    minimumStaff: z.number().int().min(1).optional(),
  }),
});

export const createAvailabilitySchema = z.object({
  body: z.object({
    employeeId: z.string().min(1),
    type: z.enum(['WEEKLY_OFF', 'LEAVE', 'COMP_OFF']),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').nullable().optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').nullable().optional(),
    status: z.enum(['APPROVED', 'PENDING']),
    reason: z.string().nullable().optional(),
  }),
});

export const updateAvailabilitySchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    type: z.enum(['WEEKLY_OFF', 'LEAVE', 'COMP_OFF']).optional(),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').nullable().optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').nullable().optional(),
    status: z.enum(['APPROVED', 'PENDING']).optional(),
    reason: z.string().nullable().optional(),
  }),
});

export const createPublicHolidaySchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    name: z.string().min(1, 'Holiday name is required'),
    region: z.string().optional(),
  }),
});

export const generateRosterSchema = z.object({
  body: z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2020).max(2050),
  }),
});

export const publishRosterSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    force: z.boolean().optional(),
  }),
});

export const assignReplacementSchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    employeeId: z.string().min(1, 'employeeId is required'),
  }),
});

export const updateEntrySchema = z.object({
  params: z.object({ id: z.string() }),
  body: z.object({
    status: z.enum(['WORKING', 'WEEKLY_OFF', 'LEAVE', 'COMP_OFF', 'HOLIDAY_OFF']).optional(),
    employeeId: z.string().optional(),
    brandId: z.string().nullable().optional(),
    processId: z.string().nullable().optional(),
    override: z.boolean().optional(),
  }),
});
