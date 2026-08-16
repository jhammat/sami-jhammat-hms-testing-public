export type DemoDoctorSittingStatus =
  | "not-started"
  | "available"
  | "on-break"
  | "finished";

export interface DemoDoctorSitting {
  id: string;
  practitionerId: string;
  branchId: string;
  businessDate: string;
  roomId: string;
  roomLabel: string;
  sittingStartTime: string;
  sittingEndTime: string;
  averageConsultationMinutes: number;
  status: DemoDoctorSittingStatus;
  actualStartedAt?: string;
  actualEndedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveDemoDoctorSittingInput {
  practitionerId: string;
  branchId: string;
  businessDate: string;
  roomId: string;
  roomLabel: string;
  sittingStartTime: string;
  sittingEndTime: string;
  averageConsultationMinutes: number;
  status?: DemoDoctorSittingStatus;
}
