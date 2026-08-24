import { database } from "@wonflow/database";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { educationService } from "../../src/server/clinical/education-service";
import type { WonFlowRequestContext } from "@wonflow/contracts";

describe("Education Library & Compliance (Task C-08)", () => {
  const testRunId = `test-edu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let tenantId: string;
  let orgId: string;
  let branchId: string;
  let staffIdentityId: string;
  let staffMembershipId: string;
  let patientIdentityId: string;
  let patientMembershipId: string;
  let patientId: string;

  beforeEach(async () => {
    // 1. Create Tenant
    const tenant = await database.tenant.create({
      data: {
        slug: `tenant-${testRunId}`,
        displayName: `Hospital Tenant ${testRunId}`,
        legalName: `Hospital Legal ${testRunId}`,
      },
    });
    tenantId = tenant.id;

    // 2. Create Organization & Branch
    const org = await database.organization.create({
      data: {
        tenantId,
        code: `org-${testRunId}`,
        displayName: "Main Hospital Org",
        status: "ACTIVE",
      },
    });
    orgId = org.id;

    const branch = await database.branch.create({
      data: {
        tenantId,
        organizationId: org.id,
        code: `BR-${testRunId}`,
        name: "Main Branch",
        isMainBranch: true,
        status: "ACTIVE",
      },
    });
    branchId = branch.id;

    // 3. Create Doctor Staff Identity & Membership
    const doctorIdentity = await database.identity.create({
      data: {
        email: `doctor-${testRunId}@hospital.com`,
        normalizedEmail: `doctor-${testRunId}@hospital.com`,
        status: "ACTIVE",
      },
    });
    staffIdentityId = doctorIdentity.id;

    const staffMembership = await database.tenantMembership.create({
      data: {
        tenantId,
        organizationId: org.id,
        identityId: doctorIdentity.id,
        displayName: "Dr. Ayesha Surgeon",
        status: "ACTIVE",
        workspaceCodes: ["DOCTOR"],
        primaryWorkspace: "DOCTOR",
      },
    });
    staffMembershipId = staffMembership.id;

    // 4. Create Patient Identity & Patient Record
    const patientIdentity = await database.identity.create({
      data: {
        email: `patient-${testRunId}@gmail.com`,
        normalizedEmail: `patient-${testRunId}@gmail.com`,
        status: "ACTIVE",
      },
    });
    patientIdentityId = patientIdentity.id;

    const patient = await database.patient.create({
      data: {
        tenantId,
        patientNumber: `PAT-${testRunId}`,
        givenName: "Tariq",
        familyName: "Mahmood",
        email: patientIdentity.email,
        normalizedEmail: patientIdentity.normalizedEmail,
        dateOfBirth: new Date("1975-03-22"),
        phone: "+923009988776",
      },
    });
    patientId = patient.id;

    const patientMembership = await database.tenantMembership.create({
      data: {
        tenantId,
        organizationId: org.id,
        identityId: patientIdentity.id,
        displayName: "Tariq Mahmood",
        status: "ACTIVE",
        workspaceCodes: ["PATIENT"],
        primaryWorkspace: "PATIENT",
      },
    });
    patientMembershipId = patientMembership.id;

    await database.patientAccess.create({
      data: {
        patientId: patient.id,
        identityId: patientIdentity.id,
        relationship: "self",
        isPrimary: true,
        isActive: true,
      },
    });
  });

  afterEach(async () => {
    await database.auditEvent.deleteMany({ where: { tenantId } });
    await database.educationCompletion.deleteMany({
      where: { assignment: { tenantId } },
    });
    await database.educationAssignment.deleteMany({ where: { tenantId } });
    await database.educationContent.deleteMany({ where: { tenantId } });
    await database.patientAccess.deleteMany({ where: { patientId } });
    await database.patient.deleteMany({ where: { tenantId } });
    await database.tenantMembership.deleteMany({ where: { tenantId } });
    await database.branch.deleteMany({ where: { tenantId } });
    await database.organization.deleteMany({ where: { tenantId } });
    await database.tenant.deleteMany({ where: { id: tenantId } });
    const ids = [staffIdentityId, patientIdentityId].filter(Boolean);
    if (ids.length > 0) {
      await database.identity.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it("manages content library, assigns 3 items, completes 2 as patient, and clinician sees 3rd as outstanding", async () => {
    const clinicianContext: WonFlowRequestContext = {
      scope: "tenant",
      requestId: `req-doc-${Date.now()}`,
      userId: staffIdentityId,
      identityId: staffIdentityId,
      membershipId: staffMembershipId,
      sessionId: `00000000-0000-0000-0000-000000000052`,
      tenantId,
      organizationId: orgId,
      branchId,
      workspace: "DOCTOR",
      locale: "en",
      timezone: "UTC",
      currencyCode: "PKR",
      permissionCodes: [],
      sourceApplication: "web",
    };

    const patientContext: WonFlowRequestContext = {
      scope: "tenant",
      requestId: `req-pat-${Date.now()}`,
      userId: patientIdentityId,
      identityId: patientIdentityId,
      membershipId: patientMembershipId,
      sessionId: `00000000-0000-0000-0000-000000000051`,
      tenantId,
      organizationId: orgId,
      branchId,
      workspace: "PATIENT",
      locale: "en",
      timezone: "UTC",
      currencyCode: "PKR",
      permissionCodes: [],
      sourceApplication: "web",
    };

    // 1. Practice creates educational modules
    const preOpEn = await educationService.createContent(clinicianContext, {
      title: "Pre-Operative Fasting & ERAS Protocol (English)",
      description: "Essential pre-op fasting guidelines and carbohydrate loading instructions.",
      category: "Pre-Operative Preparation",
      contentType: "VIDEO",
      url: "https://wonflow.local/videos/preop-en.mp4",
      durationSeconds: 300,
      language: "en",
      hasComprehensionCheck: true,
      comprehensionQuestions: [
        {
          id: "q1",
          question: "When should you stop clear fluids before surgery?",
          options: ["Exactly 2 hours before", "12 hours before", "Do not stop"],
          correctIndex: 0,
        },
      ],
    });
    expect(preOpEn.id).toBeDefined();
    expect(preOpEn.hasComprehensionCheck).toBe(true);

    const preOpUr = await educationService.createContent(clinicianContext, {
      title: "آپریشن سے پہلے کی تیاری (اردو)",
      description: "آپریشن سے قبل بھوکا رہنے اور پانی پینے کی اہم ہدایات۔",
      category: "Pre-Operative Preparation",
      contentType: "VIDEO",
      url: "https://wonflow.local/videos/preop-ur.mp4",
      durationSeconds: 300,
      language: "ur",
    });
    expect(preOpUr.language).toBe("ur");

    const drainCare = await educationService.createContent(clinicianContext, {
      title: "Surgical Drain Emptying & Care at Home",
      description: "Step-by-step instructions on emptying JP bulb drains and logging volume.",
      category: "Post-Op Wound & Drain Care",
      contentType: "VIDEO",
      durationSeconds: 240,
      language: "en",
      hasComprehensionCheck: true,
      comprehensionQuestions: [
        {
          id: "q_drain",
          question: "What should you do before opening the drain plug?",
          options: ["Wash hands thoroughly with soap", "Wear surgical gloves only", "Nothing"],
          correctIndex: 0,
        },
      ],
    });

    const nutritionGuide = await educationService.createContent(clinicianContext, {
      title: "High-Protein Post-Surgical Nutrition",
      description: "Dietary milestones from clear liquids to soft foods after pancreatic surgery.",
      category: "Nutrition & Diet",
      contentType: "ARTICLE",
      language: "en",
    });

    // 2. Practice lists content with filters
    const allPracticeItems = await educationService.listPracticeContent(clinicianContext);
    expect(allPracticeItems.length).toBe(4);

    const urduItems = await educationService.listPracticeContent(clinicianContext, { language: "ur" });
    expect(urduItems.length).toBe(1);
    expect(urduItems[0].title).toBe("آپریشن سے پہلے کی تیاری (اردو)");

    // 3. Assign 3 items to the patient
    const assign1 = await educationService.assignContent(clinicianContext, {
      patientId,
      contentId: preOpEn.id,
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });

    const assign2 = await educationService.assignContent(clinicianContext, {
      patientId,
      contentId: drainCare.id,
      dueDate: new Date(Date.now() + 172800000).toISOString(),
    });

    const assign3 = await educationService.assignContent(clinicianContext, {
      patientId,
      contentId: nutritionGuide.id,
      dueDate: new Date(Date.now() + 259200000).toISOString(),
    });

    expect(assign1.isCompleted).toBe(false);
    expect(assign2.isCompleted).toBe(false);
    expect(assign3.isCompleted).toBe(false);

    // 4. Patient loads education library
    const patientLibraryEn = await educationService.getPatientEducationLibrary(patientContext, "en");
    expect(patientLibraryEn.assigned.length).toBe(3);
    // Unassigned active English item should be 0 because 3 were assigned out of 3 English items
    expect(patientLibraryEn.available.length).toBe(0);

    // 5. Patient completes Item 1 (Pre-Op) with comprehension quiz
    const completed1 = await educationService.completeAssignment(patientContext, {
      assignmentId: assign1.id,
      watchedSeconds: 300,
      selectedAnswers: { q1: 0 }, // correct answer
    });

    expect(completed1.isCompleted).toBe(true);
    expect(completed1.completion?.comprehensionPassed).toBe(true);
    expect(completed1.completion?.watchedSeconds).toBe(300);

    // 6. Patient completes Item 2 (Drain Care)
    const completed2 = await educationService.completeAssignment(patientContext, {
      assignmentId: assign2.id,
      watchedSeconds: 240,
      selectedAnswers: { q_drain: 0 },
    });

    expect(completed2.isCompleted).toBe(true);
    expect(completed2.completion?.comprehensionPassed).toBe(true);

    // 7. Clinician views compliance summary
    const compliance = await educationService.getClinicianComplianceSummary(clinicianContext);
    expect(compliance.totalAssigned).toBe(3);
    expect(compliance.completedCount).toBe(2);
    expect(compliance.outstandingCount).toBe(1);
    expect(compliance.complianceRatePercentage).toBe(67);

    // Confirms 3rd item (Nutrition Guide) is outstanding
    const outstandingAssignment = compliance.allAssignments.find((a) => a.id === assign3.id);
    expect(outstandingAssignment).toBeDefined();
    expect(outstandingAssignment?.isCompleted).toBe(false);
    expect(outstandingAssignment?.content.title).toBe("High-Protein Post-Surgical Nutrition");
  });
});
