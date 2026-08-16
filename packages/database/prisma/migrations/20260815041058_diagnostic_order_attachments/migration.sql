-- Lets a diagnostic order (a lab or radiology test) carry file attachments
-- -- scan images, photos of a printed report, PDFs -- uploaded by the
-- ordering doctor, lab/radiology staff, or the patient themselves.
--
-- uploadedByMembershipId identifies a staff/doctor uploader; when it's
-- null and patientId is set, the patient uploaded it themselves.
ALTER TABLE "DocumentRecord" ADD COLUMN     "diagnosticOrderId" UUID,
ADD COLUMN     "uploadedByMembershipId" UUID;

-- CreateIndex
CREATE INDEX "DocumentRecord_diagnosticOrderId_idx" ON "DocumentRecord"("diagnosticOrderId");

-- AddForeignKey
ALTER TABLE "DocumentRecord" ADD CONSTRAINT "DocumentRecord_diagnosticOrderId_fkey" FOREIGN KEY ("diagnosticOrderId") REFERENCES "DiagnosticOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
