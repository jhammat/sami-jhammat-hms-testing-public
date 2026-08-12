/**
 * WonFlow organization and facility hierarchy.
 *
 * Organization-level definitions are separated from branch-level operational
 * entities so the platform can support multiple branches without duplicating
 * master data.
 */

export type WonFlowId = string;
export type IsoDateTime = string;

export type RecordStatus =
  | "active"
  | "inactive"
  | "suspended"
  | "archived";

export type BranchType =
  | "hospital"
  | "clinic"
  | "diagnostic-center"
  | "pharmacy"
  | "laboratory"
  | "specialty-center"
  | "administrative-office"
  | "virtual-care";

export type DepartmentCategory =
  | "clinical"
  | "diagnostic"
  | "pharmacy"
  | "nursing"
  | "administrative"
  | "financial"
  | "support"
  | "emergency"
  | "inpatient"
  | "procedure";

export type UnitType =
  | "clinical-unit"
  | "nursing-unit"
  | "diagnostic-unit"
  | "procedure-unit"
  | "administrative-unit"
  | "support-unit";

export type RoomType =
  | "consultation-room"
  | "treatment-room"
  | "procedure-room"
  | "operation-theatre"
  | "laboratory-room"
  | "radiology-room"
  | "pharmacy-room"
  | "ward-room"
  | "emergency-room"
  | "recovery-room"
  | "office"
  | "store"
  | "meeting-room"
  | "waiting-room"
  | "other";

export type CounterType =
  | "reception"
  | "registration"
  | "appointment"
  | "billing"
  | "cashier"
  | "insurance"
  | "pharmacy"
  | "laboratory"
  | "radiology"
  | "admission"
  | "information"
  | "other";

export type ServicePointType =
  | "front-desk"
  | "consultation"
  | "sample-collection"
  | "imaging"
  | "dispensing"
  | "billing"
  | "procedure"
  | "nursing-station"
  | "triage"
  | "admission"
  | "virtual"
  | "other";

export interface Organization {
  id: WonFlowId;
  legalName: string;
  displayName: string;
  code: string;
  status: RecordStatus;
  defaultLanguage: string;
  defaultCurrency: string;
  timezone: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Branch {
  id: WonFlowId;
  organizationId: WonFlowId;
  name: string;
  code: string;
  type: BranchType;
  status: RecordStatus;
  phone?: string;
  email?: string;
  address?: string;
  timezone: string;
  isMainBranch: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * An organization-wide department definition.
 *
 * Example: Cardiology is defined once for the organization.
 */
export interface DepartmentDefinition {
  id: WonFlowId;
  organizationId: WonFlowId;
  name: string;
  code: string;
  category: DepartmentCategory;
  description?: string;
  status: RecordStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * Activates an organization department at a particular branch.
 *
 * Example: Cardiology at Main Hospital.
 */
export interface BranchDepartment {
  id: WonFlowId;
  organizationId: WonFlowId;
  branchId: WonFlowId;
  departmentDefinitionId: WonFlowId;
  localDisplayName?: string;
  phoneExtension?: string;
  status: RecordStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * A smaller operational division inside a branch department.
 *
 * Examples:
 * - Interventional Cardiology Unit
 * - Echocardiography Unit
 * - Adult OPD Unit
 */
export interface OperationalUnit {
  id: WonFlowId;
  organizationId: WonFlowId;
  branchId: WonFlowId;
  branchDepartmentId: WonFlowId;
  parentUnitId?: WonFlowId;
  name: string;
  code: string;
  type: UnitType;
  status: RecordStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Building {
  id: WonFlowId;
  organizationId: WonFlowId;
  branchId: WonFlowId;
  name: string;
  code: string;
  status: RecordStatus;
}

export interface Floor {
  id: WonFlowId;
  organizationId: WonFlowId;
  branchId: WonFlowId;
  buildingId: WonFlowId;
  name: string;
  code: string;
  floorNumber?: number;
  status: RecordStatus;
}

export interface Room {
  id: WonFlowId;
  organizationId: WonFlowId;
  branchId: WonFlowId;
  buildingId?: WonFlowId;
  floorId?: WonFlowId;
  branchDepartmentId?: WonFlowId;
  operationalUnitId?: WonFlowId;
  name: string;
  code: string;
  type: RoomType;
  capacity?: number;
  status: RecordStatus;
}

export interface Counter {
  id: WonFlowId;
  organizationId: WonFlowId;
  branchId: WonFlowId;
  branchDepartmentId?: WonFlowId;
  operationalUnitId?: WonFlowId;
  roomId?: WonFlowId;
  name: string;
  code: string;
  type: CounterType;
  status: RecordStatus;
}

export interface WaitingArea {
  id: WonFlowId;
  organizationId: WonFlowId;
  branchId: WonFlowId;
  branchDepartmentId?: WonFlowId;
  operationalUnitId?: WonFlowId;
  roomId?: WonFlowId;
  name: string;
  code: string;
  capacity?: number;
  status: RecordStatus;
}

/**
 * A Service Point represents an operational location where work is performed.
 *
 * It may be connected to a room or counter, but it is not itself necessarily
 * a physical room.
 */
export interface ServicePoint {
  id: WonFlowId;
  organizationId: WonFlowId;
  branchId: WonFlowId;
  branchDepartmentId?: WonFlowId;
  operationalUnitId?: WonFlowId;
  roomId?: WonFlowId;
  counterId?: WonFlowId;
  waitingAreaId?: WonFlowId;
  name: string;
  code: string;
  type: ServicePointType;
  supportsQueue: boolean;
  supportsAppointments: boolean;
  status: RecordStatus;
}

export interface Bed {
  id: WonFlowId;
  organizationId: WonFlowId;
  branchId: WonFlowId;
  roomId: WonFlowId;
  name: string;
  code: string;
  status: RecordStatus;
}

export interface OrganizationHierarchy {
  organization: Organization;
  branches: Branch[];
  departmentDefinitions: DepartmentDefinition[];
  branchDepartments: BranchDepartment[];
  operationalUnits: OperationalUnit[];
  buildings: Building[];
  floors: Floor[];
  rooms: Room[];
  counters: Counter[];
  waitingAreas: WaitingArea[];
  servicePoints: ServicePoint[];
  beds: Bed[];
}