/**
 * Typed API Client for Syncron Smart Roster Management System.
 * Connects to the Express backend (default: http://localhost:4000/api).
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: any;
}

export class ApiException extends Error {
  status: number;
  code: string;
  details?: any;

  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: { message: response.statusText } };
    }

    const err = errorData.error || errorData;
    throw new ApiException(
      response.status,
      err.code || 'UNKNOWN_ERROR',
      err.message || 'An unexpected error occurred',
      err.details
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// -----------------------------------------------------------------------------
// DOMAIN TYPES
// -----------------------------------------------------------------------------
export type EntryStatusType =
  | 'WORKING'
  | 'WEEKLY_OFF'
  | 'LEAVE'
  | 'COMP_OFF'
  | 'HOLIDAY_OFF'
  | 'NOT_SCHEDULED';

export type ConflictTypeEnum =
  | 'COVERAGE_GAP'
  | 'INSUFFICIENT_STAFF'
  | 'OVERLAP'
  | 'LEAVE_CONFLICT';

export type AvailabilityTypeEnum = 'WEEKLY_OFF' | 'LEAVE' | 'COMP_OFF';
export type AvailabilityStatusEnum = 'APPROVED' | 'PENDING';

export interface Employee {
  id: string;
  name: string;
  email: string;
  podId: string;
  status: 'ACTIVE' | 'INACTIVE';
  pod?: { id: string; name: string };
  assignments?: Assignment[];
  availabilities?: EmployeeAvailability[];
}

export interface Pod {
  id: string;
  name: string;
  leadEmployeeId?: string | null;
  lead?: { id: string; name: string; email: string } | null;
  members?: Employee[];
  _count?: { members: number };
}

export interface Brand {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  assignments?: Assignment[];
  operatingRules?: OperatingRule[];
  coverageRequirements?: CoverageRequirement[];
  _count?: { assignments: number; operatingRules: number };
}

export interface Process {
  id: string;
  name: string;
}

export interface Assignment {
  id: string;
  employeeId: string;
  brandId: string;
  processId: string;
  employee?: Employee;
  brand?: Brand;
  process?: Process;
}

export interface OperatingRule {
  id: string;
  brandId: string;
  processId: string;
  workingDays: number[];
  operatesOnPublicHolidays: boolean;
  brand?: Brand;
  process?: Process;
}

export interface CoverageRequirement {
  id: string;
  brandId: string;
  processId: string;
  minimumStaff: number;
  date?: string | null;
  dayOfWeek?: number | null;
  brand?: Brand;
  process?: Process;
}

export interface EmployeeAvailability {
  id: string;
  employeeId: string;
  type: AvailabilityTypeEnum;
  dayOfWeek?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  status: AvailabilityStatusEnum;
  reason?: string | null;
  employee?: { id: string; name: string };
}

export interface PublicHoliday {
  id: string;
  date: string;
  name: string;
  region: string;
}

export interface Roster {
  id: string;
  month: number;
  year: number;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  updatedAt: string;
  _count?: { entries: number; conflicts: number };
}

export interface RosterEntry {
  id: string;
  rosterId: string;
  employeeId: string;
  brandId: string | null;
  processId: string | null;
  date: string;
  status: EntryStatusType;
  brand?: { id: string; name: string } | null;
  process?: { id: string; name: string } | null;
  employee?: { id: string; name: string } | null;
}

export interface Conflict {
  id: string;
  rosterId: string;
  date: string;
  brandId: string;
  processId: string;
  type: ConflictTypeEnum;
  requiredStaff: number;
  availableStaff: number;
  message: string;
  status: 'OPEN' | 'RESOLVED';
  resolvedAt?: string | null;
  brand?: { id: string; name: string };
  process?: { id: string; name: string };
}

export interface ReplacementCandidate {
  employeeId: string;
  employeeName: string;
  email: string;
  primaryBrandId?: string;
  primaryBrandName?: string;
  workingDaysSoFar: number;
}

export interface MutationResult {
  entry?: RosterEntry;
  availability?: EmployeeAvailability;
  requirement?: CoverageRequirement;
  openedConflicts?: Conflict[];
  resolvedConflicts?: Conflict[];
  totalOpen?: number;
  syncResults?: Array<{
    rosterId: string;
    openedConflicts: Conflict[];
    resolvedConflicts: Conflict[];
    totalOpen: number;
  }>;
}

export interface EmployeeViewRow {
  employee: {
    id: string;
    name: string;
    email: string;
    pod: string;
  };
  schedule: Array<{
    id: string;
    date: string;
    status: EntryStatusType;
    brand: { id: string; name: string } | null;
    process: { id: string; name: string } | null;
  }>;
}

export interface BrandViewRow {
  date: string;
  brandId: string;
  brandName: string;
  processId: string;
  processName: string;
  required: number;
  allocated: number;
  coverageStatus: 'OK' | 'GAP' | 'PARTIAL';
  employees: Array<{ id: string; name: string }>;
}

export interface DashboardData {
  employees: number;
  brands: number;
  pods: number;
  processes: number;
  roster: { id: string; month: number; year: number; status: 'DRAFT' | 'PUBLISHED' } | null;
  requiredSlots: number;
  filledSlots: number;
  coveragePercent: number;
  openConflictsByType: Record<string, number>;
  resolvedConflicts: number;
  topBrandCoverage?: Array<{
    brandName: string;
    required: number;
    allocated: number;
    percent: number;
    status: 'OK' | 'GAP' | 'PARTIAL';
  }>;
}

// -----------------------------------------------------------------------------
// API CLIENT METHODS
// -----------------------------------------------------------------------------
export const api = {
  // Health
  getHealth: () => request<{ status: string; service: string; timestamp: string }>('/health'),

  // Dashboard
  getDashboard: (month: number, year: number) =>
    request<DashboardData>(`/dashboard?month=${month}&year=${year}`),

  // Rosters
  generateRoster: (month: number, year: number) =>
    request<{ roster: Roster; stats: any; conflictsCount: number }>('/rosters/generate', {
      method: 'POST',
      body: JSON.stringify({ month, year }),
    }),

  listRosters: (params?: { month?: number; year?: number }) => {
    const qs = new URLSearchParams();
    if (params?.month) qs.set('month', String(params.month));
    if (params?.year) qs.set('year', String(params.year));
    return request<Roster[]>(`/rosters?${qs.toString()}`);
  },

  getRosterById: (id: string) => request<Roster>(`/rosters/${id}`),

  getRosterEntries: (id: string, params?: { employeeId?: string; brandId?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.employeeId) qs.set('employeeId', params.employeeId);
    if (params?.brandId) qs.set('brandId', params.brandId);
    if (params?.status) qs.set('status', params.status);
    return request<RosterEntry[]>(`/rosters/${id}/entries?${qs.toString()}`);
  },

  getEmployeeView: (rosterId: string) =>
    request<EmployeeViewRow[]>(`/rosters/${rosterId}/employee-view`),

  getBrandView: (rosterId: string) =>
    request<BrandViewRow[]>(`/rosters/${rosterId}/brand-view`),

  getConflicts: (rosterId: string, params?: { status?: string; type?: string; brandId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.type) qs.set('type', params.type);
    if (params?.brandId) qs.set('brandId', params.brandId);
    return request<Conflict[]>(`/rosters/${rosterId}/conflicts?${qs.toString()}`);
  },

  publishRoster: (rosterId: string, force = false) =>
    request<Roster>(`/rosters/${rosterId}/publish`, {
      method: 'POST',
      body: JSON.stringify({ force }),
    }),

  // Conflict Resolution & Replacements
  getReplacements: (conflictId: string) =>
    request<ReplacementCandidate[]>(`/conflicts/${conflictId}/replacements`),

  assignReplacement: (conflictId: string, employeeId: string) =>
    request<MutationResult>(`/conflicts/${conflictId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ employeeId }),
    }),

  // Roster Entry Edits
  updateRosterEntry: (
    entryId: string,
    data: {
      status?: EntryStatusType;
      employeeId?: string;
      brandId?: string | null;
      processId?: string | null;
      override?: boolean;
    }
  ) =>
    request<MutationResult>(`/roster-entries/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  unassignRosterEntry: (entryId: string) =>
    request<MutationResult>(`/roster-entries/${entryId}`, {
      method: 'DELETE',
    }),

  // Employees CRUD
  getEmployees: (params?: { podId?: string; brandId?: string; status?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.podId) qs.set('podId', params.podId);
    if (params?.brandId) qs.set('brandId', params.brandId);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    return request<Employee[]>(`/employees?${qs.toString()}`);
  },

  getEmployeeById: (id: string) => request<Employee>(`/employees/${id}`),

  createEmployee: (data: { name: string; email: string; podId: string; status?: string }) =>
    request<Employee>('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEmployee: (id: string, data: { name?: string; email?: string; podId?: string; status?: string }) =>
    request<Employee>(`/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteEmployee: (id: string) =>
    request<{ success: boolean }>(`/employees/${id}`, { method: 'DELETE' }),

  // Pods CRUD
  getPods: () => request<Pod[]>('/pods'),
  getPodById: (id: string) => request<Pod>(`/pods/${id}`),
  createPod: (data: { name: string; leadEmployeeId?: string | null }) =>
    request<Pod>('/pods', { method: 'POST', body: JSON.stringify(data) }),
  updatePod: (id: string, data: { name?: string; leadEmployeeId?: string | null }) =>
    request<Pod>(`/pods/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePod: (id: string) => request<{ success: boolean }>(`/pods/${id}`, { method: 'DELETE' }),

  // Brands CRUD
  getBrands: () => request<Brand[]>('/brands'),
  getBrandById: (id: string) => request<Brand>(`/brands/${id}`),
  createBrand: (data: { name: string; status?: string }) =>
    request<Brand>('/brands', { method: 'POST', body: JSON.stringify(data) }),
  updateBrand: (id: string, data: { name?: string; status?: string }) =>
    request<Brand>(`/brands/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBrand: (id: string) => request<{ success: boolean }>(`/brands/${id}`, { method: 'DELETE' }),

  // Processes CRUD
  getProcesses: () => request<Process[]>('/processes'),
  createProcess: (data: { name: string }) =>
    request<Process>('/processes', { method: 'POST', body: JSON.stringify(data) }),
  updateProcess: (id: string, data: { name: string }) =>
    request<Process>(`/processes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteProcess: (id: string) => request<{ success: boolean }>(`/processes/${id}`, { method: 'DELETE' }),

  // Assignments
  getAssignments: () => request<Assignment[]>('/assignments'),
  createAssignment: (data: { employeeId: string; brandId: string; processId: string }) =>
    request<Assignment>('/assignments', { method: 'POST', body: JSON.stringify(data) }),
  deleteAssignment: (id: string) =>
    request<{ success: boolean }>(`/assignments/${id}`, { method: 'DELETE' }),

  // Operating Rules
  getOperatingRules: () => request<OperatingRule[]>('/operating-rules'),
  createOperatingRule: (data: {
    brandId: string;
    processId: string;
    workingDays: number[];
    operatesOnPublicHolidays: boolean;
  }) => request<OperatingRule>('/operating-rules', { method: 'POST', body: JSON.stringify(data) }),
  updateOperatingRule: (
    id: string,
    data: { workingDays?: number[]; operatesOnPublicHolidays?: boolean }
  ) => request<OperatingRule>(`/operating-rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteOperatingRule: (id: string) =>
    request<{ success: boolean }>(`/operating-rules/${id}`, { method: 'DELETE' }),

  // Coverage Requirements
  getCoverageRequirements: () => request<CoverageRequirement[]>('/coverage-requirements'),
  createCoverageRequirement: (data: {
    brandId: string;
    processId: string;
    minimumStaff: number;
    date?: string | null;
    dayOfWeek?: number | null;
  }) => request<CoverageRequirement>('/coverage-requirements', { method: 'POST', body: JSON.stringify(data) }),
  updateCoverageRequirement: (id: string, data: { minimumStaff?: number }) =>
    request<MutationResult>(`/coverage-requirements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteCoverageRequirement: (id: string) =>
    request<{ success: boolean }>(`/coverage-requirements/${id}`, { method: 'DELETE' }),

  // Availability
  getAvailabilities: (params?: { employeeId?: string; type?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.employeeId) qs.set('employeeId', params.employeeId);
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    return request<EmployeeAvailability[]>(`/availability?${qs.toString()}`);
  },
  createAvailability: (data: {
    employeeId: string;
    type: AvailabilityTypeEnum;
    dayOfWeek?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    status: AvailabilityStatusEnum;
    reason?: string | null;
  }) =>
    request<MutationResult>('/availability', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAvailability: (id: string, data: any) =>
    request<MutationResult>(`/availability/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteAvailability: (id: string) =>
    request<MutationResult>(`/availability/${id}`, {
      method: 'DELETE',
    }),

  // Public Holidays
  getPublicHolidays: () => request<PublicHoliday[]>('/public-holidays'),
  createPublicHoliday: (data: { date: string; name: string; region?: string }) =>
    request<PublicHoliday>('/public-holidays', { method: 'POST', body: JSON.stringify(data) }),
  deletePublicHoliday: (id: string) =>
    request<{ success: boolean }>(`/public-holidays/${id}`, { method: 'DELETE' }),
};
