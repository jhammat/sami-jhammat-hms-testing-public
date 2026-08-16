-- CreateEnum
CREATE TYPE "AppointmentPaymentStatus" AS ENUM ('NOT_REQUIRED', 'AWAITING_PAYMENT', 'PAYMENT_CONFIRMED');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "paymentProofDocumentId" UUID,
ADD COLUMN     "paymentStatus" "AppointmentPaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED';

-- AlterTable
ALTER TABLE "ServiceDefinition" ADD COLUMN     "requiresPrepayment" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_paymentProofDocumentId_fkey" FOREIGN KEY ("paymentProofDocumentId") REFERENCES "DocumentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "appointment_branch_id_idx" RENAME TO "Appointment_branchId_idx";

-- RenameIndex
ALTER INDEX "appointment_doctor_id_idx" RENAME TO "Appointment_doctorId_idx";

-- RenameIndex
ALTER INDEX "appointment_patient_id_idx" RENAME TO "Appointment_patientId_idx";

-- RenameIndex
ALTER INDEX "appointment_service_id_idx" RENAME TO "Appointment_serviceId_idx";

-- RenameIndex
ALTER INDEX "auth_session_membership_id_idx" RENAME TO "AuthSession_membershipId_idx";

-- RenameIndex
ALTER INDEX "availability_rule_branch_id_idx" RENAME TO "AvailabilityRule_branchId_idx";

-- RenameIndex
ALTER INDEX "availability_rule_doctor_id_idx" RENAME TO "AvailabilityRule_doctorId_idx";

-- RenameIndex
ALTER INDEX "availability_rule_service_id_idx" RENAME TO "AvailabilityRule_serviceId_idx";

-- RenameIndex
ALTER INDEX "branch_organization_id_idx" RENAME TO "Branch_organizationId_idx";

-- RenameIndex
ALTER INDEX "clinical_observation_encounter_id_idx" RENAME TO "ClinicalObservation_encounterId_idx";

-- RenameIndex
ALTER INDEX "clinical_observation_patient_id_idx" RENAME TO "ClinicalObservation_patientId_idx";

-- RenameIndex
ALTER INDEX "department_branch_id_idx" RENAME TO "Department_branchId_idx";

-- RenameIndex
ALTER INDEX "department_organization_id_idx" RENAME TO "Department_organizationId_idx";

-- RenameIndex
ALTER INDEX "diagnostic_order_branch_id_idx" RENAME TO "DiagnosticOrder_branchId_idx";

-- RenameIndex
ALTER INDEX "diagnostic_order_encounter_id_idx" RENAME TO "DiagnosticOrder_encounterId_idx";

-- RenameIndex
ALTER INDEX "diagnostic_order_patient_id_idx" RENAME TO "DiagnosticOrder_patientId_idx";

-- RenameIndex
ALTER INDEX "diagnostic_specimen_diagnostic_order_id_idx" RENAME TO "DiagnosticSpecimen_diagnosticOrderId_idx";

-- RenameIndex
ALTER INDEX "dispense_branch_id_idx" RENAME TO "Dispense_branchId_idx";

-- RenameIndex
ALTER INDEX "dispense_patient_id_idx" RENAME TO "Dispense_patientId_idx";

-- RenameIndex
ALTER INDEX "dispense_prescription_id_idx" RENAME TO "Dispense_prescriptionId_idx";

-- RenameIndex
ALTER INDEX "dispense_item_medication_id_idx" RENAME TO "DispenseItem_medicationId_idx";

-- RenameIndex
ALTER INDEX "dispense_item_prescription_item_id_idx" RENAME TO "DispenseItem_prescriptionItemId_idx";

-- RenameIndex
ALTER INDEX "doctor_profile_department_id_idx" RENAME TO "DoctorProfile_departmentId_idx";

-- RenameIndex
ALTER INDEX "doctor_profile_supervisor_doctor_id_idx" RENAME TO "DoctorProfile_supervisorDoctorId_idx";

-- RenameIndex
ALTER INDEX "doctor_sitting_branch_id_idx" RENAME TO "DoctorSitting_branchId_idx";

-- RenameIndex
ALTER INDEX "doctor_sitting_doctor_id_idx" RENAME TO "DoctorSitting_doctorId_idx";

-- RenameIndex
ALTER INDEX "document_access_token_document_id_idx" RENAME TO "DocumentAccessToken_documentId_idx";

-- RenameIndex
ALTER INDEX "document_record_object_id_idx" RENAME TO "DocumentRecord_objectId_idx";

-- RenameIndex
ALTER INDEX "document_record_patient_id_idx" RENAME TO "DocumentRecord_patientId_idx";

-- RenameIndex
ALTER INDEX "encounter_branch_id_idx" RENAME TO "Encounter_branchId_idx";

-- RenameIndex
ALTER INDEX "encounter_doctor_id_idx" RENAME TO "Encounter_doctorId_idx";

-- RenameIndex
ALTER INDEX "encounter_patient_id_idx" RENAME TO "Encounter_patientId_idx";

-- RenameIndex
ALTER INDEX "encounter_diagnosis_encounter_id_idx" RENAME TO "EncounterDiagnosis_encounterId_idx";

-- RenameIndex
ALTER INDEX "encounter_diagnosis_patient_id_idx" RENAME TO "EncounterDiagnosis_patientId_idx";

-- RenameIndex
ALTER INDEX "encounter_note_encounter_id_idx" RENAME TO "EncounterNote_encounterId_idx";

-- RenameIndex
ALTER INDEX "inventory_batch_branch_id_idx" RENAME TO "InventoryBatch_branchId_idx";

-- RenameIndex
ALTER INDEX "inventory_batch_medication_id_idx" RENAME TO "InventoryBatch_medicationId_idx";

-- RenameIndex
ALTER INDEX "invoice_branch_id_idx" RENAME TO "Invoice_branchId_idx";

-- RenameIndex
ALTER INDEX "invoice_patient_id_idx" RENAME TO "Invoice_patientId_idx";

-- RenameIndex
ALTER INDEX "invoice_line_service_id_idx" RENAME TO "InvoiceLine_serviceId_idx";

-- RenameIndex
ALTER INDEX "membership_permission_grant_branch_id_idx" RENAME TO "MembershipPermissionGrant_branchId_idx";

-- RenameIndex
ALTER INDEX "membership_permission_grant_membership_id_idx" RENAME TO "MembershipPermissionGrant_membershipId_idx";

-- RenameIndex
ALTER INDEX "membership_permission_grant_permission_id_idx" RENAME TO "MembershipPermissionGrant_permissionId_idx";

-- RenameIndex
ALTER INDEX "membership_role_branch_id_idx" RENAME TO "MembershipRole_branchId_idx";

-- RenameIndex
ALTER INDEX "membership_role_membership_id_idx" RENAME TO "MembershipRole_membershipId_idx";

-- RenameIndex
ALTER INDEX "membership_role_role_id_idx" RENAME TO "MembershipRole_roleId_idx";

-- RenameIndex
ALTER INDEX "notification_patient_id_idx" RENAME TO "Notification_patientId_idx";

-- RenameIndex
ALTER INDEX "one_time_token_tenant_id_idx" RENAME TO "OneTimeToken_tenantId_idx";

-- RenameIndex
ALTER INDEX "patient_allergy_patient_id_idx" RENAME TO "PatientAllergy_patientId_idx";

-- RenameIndex
ALTER INDEX "patient_identifier_patient_id_idx" RENAME TO "PatientIdentifier_patientId_idx";

-- RenameIndex
ALTER INDEX "payment_invoice_id_idx" RENAME TO "Payment_invoiceId_idx";

-- RenameIndex
ALTER INDEX "pharmacy_return_branch_id_idx" RENAME TO "PharmacyReturn_branchId_idx";

-- RenameIndex
ALTER INDEX "pharmacy_return_dispense_id_idx" RENAME TO "PharmacyReturn_dispenseId_idx";

-- RenameIndex
ALTER INDEX "pharmacy_return_patient_id_idx" RENAME TO "PharmacyReturn_patientId_idx";

-- RenameIndex
ALTER INDEX "pharmacy_return_line_medication_id_idx" RENAME TO "PharmacyReturnLine_medicationId_idx";

-- RenameIndex
ALTER INDEX "policy_document_organization_id_idx" RENAME TO "PolicyDocument_organizationId_idx";

-- RenameIndex
ALTER INDEX "prescription_doctor_id_idx" RENAME TO "Prescription_doctorId_idx";

-- RenameIndex
ALTER INDEX "prescription_encounter_id_idx" RENAME TO "Prescription_encounterId_idx";

-- RenameIndex
ALTER INDEX "prescription_patient_id_idx" RENAME TO "Prescription_patientId_idx";

-- RenameIndex
ALTER INDEX "prescription_item_medication_id_idx" RENAME TO "PrescriptionItem_medicationId_idx";

-- RenameIndex
ALTER INDEX "purchase_receipt_branch_id_idx" RENAME TO "PurchaseReceipt_branchId_idx";

-- RenameIndex
ALTER INDEX "purchase_receipt_supplier_id_idx" RENAME TO "PurchaseReceipt_supplierId_idx";

-- RenameIndex
ALTER INDEX "purchase_receipt_line_medication_id_idx" RENAME TO "PurchaseReceiptLine_medicationId_idx";

-- RenameIndex
ALTER INDEX "queue_branch_id_idx" RENAME TO "Queue_branchId_idx";

-- RenameIndex
ALTER INDEX "queue_entry_patient_id_idx" RENAME TO "QueueEntry_patientId_idx";

-- RenameIndex
ALTER INDEX "refund_invoice_id_idx" RENAME TO "Refund_invoiceId_idx";

-- RenameIndex
ALTER INDEX "refund_payment_id_idx" RENAME TO "Refund_paymentId_idx";

-- RenameIndex
ALTER INDEX "role_permission_permission_id_idx" RENAME TO "RolePermission_permissionId_idx";

-- RenameIndex
ALTER INDEX "role_permission_role_id_idx" RENAME TO "RolePermission_roleId_idx";

-- RenameIndex
ALTER INDEX "service_definition_branch_id_idx" RENAME TO "ServiceDefinition_branchId_idx";

-- RenameIndex
ALTER INDEX "service_definition_doctor_id_idx" RENAME TO "ServiceDefinition_doctorId_idx";

-- RenameIndex
ALTER INDEX "service_definition_handler_membership_id_idx" RENAME TO "ServiceDefinition_handlerMembershipId_idx";

-- RenameIndex
ALTER INDEX "service_fee_history_service_id_idx" RENAME TO "ServiceFeeHistory_serviceId_idx";

-- RenameIndex
ALTER INDEX "staff_profile_branch_id_idx" RENAME TO "StaffProfile_branchId_idx";

-- RenameIndex
ALTER INDEX "stock_movement_branch_id_idx" RENAME TO "StockMovement_branchId_idx";

-- RenameIndex
ALTER INDEX "stock_movement_inventory_batch_id_idx" RENAME TO "StockMovement_inventoryBatchId_idx";

-- RenameIndex
ALTER INDEX "stock_movement_medication_id_idx" RENAME TO "StockMovement_medicationId_idx";

-- RenameIndex
ALTER INDEX "tenant_membership_organization_id_idx" RENAME TO "TenantMembership_organizationId_idx";

-- RenameIndex
ALTER INDEX "tenant_membership_primary_branch_id_idx" RENAME TO "TenantMembership_primaryBranchId_idx";
