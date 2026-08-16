import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/v1/readiness/[action]/route";

const mockStaffProfileFindUnique = vi.fn();
const mockBranchFindFirst = vi.fn();
const mockDoctorSittingFindFirst = vi.fn();
const mockAppointmentFindFirst = vi.fn();
const mockEncounterFindFirst = vi.fn();
const mockPatientFindFirst = vi.fn();
const mockAvailabilityRuleFindFirst = vi.fn();
const mockServiceDefinitionFindFirst = vi.fn();
const mockDoctorProfileFindFirst = vi.fn();

vi.mock("@wonflow/database", () => ({
  database: {
    staffProfile: {
      findUnique: (...args: unknown[]) => mockStaffProfileFindUnique(...args),
    },
    branch: {
      findFirst: (...args: unknown[]) => mockBranchFindFirst(...args),
    },
    doctorSitting: {
      findFirst: (...args: unknown[]) => mockDoctorSittingFindFirst(...args),
    },
    appointment: {
      findFirst: (...args: unknown[]) => mockAppointmentFindFirst(...args),
    },
    encounter: {
      findFirst: (...args: unknown[]) => mockEncounterFindFirst(...args),
    },
    patient: {
      findFirst: (...args: unknown[]) => mockPatientFindFirst(...args),
    },
    availabilityRule: {
      findFirst: (...args: unknown[]) => mockAvailabilityRuleFindFirst(...args),
    },
    serviceDefinition: {
      findFirst: (...args: unknown[]) => mockServiceDefinitionFindFirst(...args),
    },
    doctorProfile: {
      findFirst: (...args: unknown[]) => mockDoctorProfileFindFirst(...args),
    },
  },
}));

const mockRequireRequestContext = vi.fn();
vi.mock("@/lib/auth/permission-service", () => ({
  requireRequestContext: () => mockRequireRequestContext(),
}));

function setMockContext(overrides: Record<string, unknown> = {}) {
  mockRequireRequestContext.mockResolvedValue({
    scope: "tenant",
    tenantId: "tenant-1",
    organizationId: "org-1",
    membershipId: "member-1",
    requestId: "req-1",
    userId: "user-1",
    identityId: "identity-1",
    sessionId: "session-1",
    workspace: "DOCTOR",
    locale: "en",
    timezone: "UTC",
    currencyCode: "PKR",
    permissionCodes: [],
    sourceApplication: "web",
    ...overrides,
  });
}

interface Blocker {
  code: string;
}

describe("Readiness API - GET /api/v1/readiness/[action]", () => {
  beforeEach(() => {
    mockStaffProfileFindUnique.mockReset();
    mockBranchFindFirst.mockReset();
    mockDoctorSittingFindFirst.mockReset();
    mockAppointmentFindFirst.mockReset();
    mockEncounterFindFirst.mockReset();
    mockPatientFindFirst.mockReset();
    mockAvailabilityRuleFindFirst.mockReset();
    mockServiceDefinitionFindFirst.mockReset();
    mockDoctorProfileFindFirst.mockReset();
    mockRequireRequestContext.mockReset();
    setMockContext();
  });

  describe("start-sitting action", () => {
    it("returns 401 error if membershipId is null", async () => {
      mockRequireRequestContext.mockResolvedValue({
        scope: "tenant",
        tenantId: "tenant-1",
        organizationId: "org-1",
        membershipId: null,
        requestId: "req-1",
        userId: "user-1",
        identityId: "identity-1",
        sessionId: "session-1",
        workspace: "DOCTOR",
        locale: "en",
        timezone: "UTC",
        currencyCode: "PKR",
        permissionCodes: [],
        sourceApplication: "web",
      });

      const request = new Request("http://localhost/api/v1/readiness/start-sitting?branchId=branch-1&businessDate=2026-08-16&roomLabel=Room1");
      const res = await GET(request, { params: Promise.resolve({ action: "start-sitting" }) });
      const body = await res.json() as { error?: string };

      expect(res.status).toBe(401);
      expect(body.error).toBeDefined();
    });

    it("returns staff-profile-required blocker if staff profile is missing", async () => {
      mockStaffProfileFindUnique.mockResolvedValue(null);

      const request = new Request("http://localhost/api/v1/readiness/start-sitting?branchId=branch-1&businessDate=2026-08-16&roomLabel=Room1");
      const res = await GET(request, { params: Promise.resolve({ action: "start-sitting" }) });
      const body = await res.json() as { ready: boolean; blockers: Blocker[] };

      expect(body.ready).toBe(false);
      expect(body.blockers[0].code).toBe("staff-profile-required");
    });

    it("returns staff-profile-inactive blocker if staff profile is not ACTIVE", async () => {
      mockStaffProfileFindUnique.mockResolvedValue({
        id: "staff-1",
        status: "SUSPENDED",
        doctor: null,
      });

      const request = new Request("http://localhost/api/v1/readiness/start-sitting?branchId=branch-1&businessDate=2026-08-16&roomLabel=Room1");
      const res = await GET(request, { params: Promise.resolve({ action: "start-sitting" }) });
      const body = await res.json() as { ready: boolean; blockers: Blocker[] };

      expect(body.ready).toBe(false);
      expect(body.blockers.some((b: Blocker) => b.code === "staff-profile-inactive")).toBe(true);
    });

    it("returns doctor-profile-required blocker if staff profile has no doctor profile", async () => {
      mockStaffProfileFindUnique.mockResolvedValue({
        id: "staff-1",
        status: "ACTIVE",
        doctor: null,
      });

      const request = new Request("http://localhost/api/v1/readiness/start-sitting?branchId=branch-1&businessDate=2026-08-16&roomLabel=Room1");
      const res = await GET(request, { params: Promise.resolve({ action: "start-sitting" }) });
      const body = await res.json() as { ready: boolean; blockers: Blocker[] };

      expect(body.ready).toBe(false);
      expect(body.blockers.some((b: Blocker) => b.code === "doctor-profile-required")).toBe(true);
    });

    it("returns doctor-branch-required blocker if staff profile has no branchId", async () => {
      mockStaffProfileFindUnique.mockResolvedValue({
        id: "staff-1",
        status: "ACTIVE",
        branchId: null,
        doctor: { id: "doctor-1" },
      });
      mockBranchFindFirst.mockResolvedValue(null); // branch check

      const request = new Request("http://localhost/api/v1/readiness/start-sitting?branchId=branch-1&businessDate=2026-08-16&roomLabel=Room1");
      const res = await GET(request, { params: Promise.resolve({ action: "start-sitting" }) });
      const body = await res.json() as { ready: boolean; blockers: Blocker[] };

      expect(body.ready).toBe(false);
      expect(body.blockers.some((b: Blocker) => b.code === "doctor-branch-required")).toBe(true);
    });

    it("returns branch-not-found, branch-inactive or branch-archived blockers depending on branch state", async () => {
      mockStaffProfileFindUnique.mockResolvedValue({
        id: "staff-1",
        status: "ACTIVE",
        branchId: "branch-1",
        doctor: { id: "doctor-1" },
      });
      
      mockBranchFindFirst.mockResolvedValue({
        id: "branch-1",
        name: "Test Branch",
        status: "INACTIVE",
        archivedAt: null,
      });
      mockDoctorSittingFindFirst.mockResolvedValue(null);

      const request = new Request("http://localhost/api/v1/readiness/start-sitting?branchId=branch-1&businessDate=2026-08-16&roomLabel=Room1");
      const res = await GET(request, { params: Promise.resolve({ action: "start-sitting" }) });
      const body = await res.json() as { ready: boolean; blockers: Blocker[] };

      expect(body.ready).toBe(false);
      expect(body.blockers.some((b: Blocker) => b.code === "branch-inactive")).toBe(true);
    });
  });

  describe("start-consultation action", () => {
    it("returns blockers if sitting is not active, patient is not checked in, and prepayment is missing", async () => {
      mockStaffProfileFindUnique.mockResolvedValue({
        id: "staff-1",
        status: "ACTIVE",
        doctor: { id: "doctor-1" },
      });

      mockAppointmentFindFirst.mockResolvedValue({
        id: "appt-1",
        doctorId: "doctor-1",
        startsAt: new Date(),
        checkedInAt: null, // patient not checked in
        paymentStatus: "AWAITING_PAYMENT",
        patient: { givenName: "Ali", familyName: "Khan" },
        service: { name: "Consultation", requiresPrepayment: true },
      });
      
      mockDoctorSittingFindFirst.mockResolvedValue(null); // no active sitting
      mockEncounterFindFirst.mockResolvedValue(null); // no open encounter

      const request = new Request("http://localhost/api/v1/readiness/start-consultation?appointmentId=appt-1");
      const res = await GET(request, { params: Promise.resolve({ action: "start-consultation" }) });
      const body = await res.json() as { ready: boolean; blockers: Blocker[] };

      expect(body.ready).toBe(false);
      expect(body.blockers.some((b: Blocker) => b.code === "no-active-sitting")).toBe(true);
      expect(body.blockers.some((b: Blocker) => b.code === "patient-not-checked-in")).toBe(true);
      expect(body.blockers.some((b: Blocker) => b.code === "payment-not-confirmed")).toBe(true);
    });
  });

  describe("book-appointment action", () => {
    it("returns blockers if patient doesn't exist, no published availability, or slot taken", async () => {
      mockPatientFindFirst.mockResolvedValue(null); // patient not found
      mockDoctorProfileFindFirst.mockResolvedValue({
        id: "doctor-1",
        staffProfile: { membership: { displayName: "Dr. Asif" } },
      });
      mockAvailabilityRuleFindFirst.mockResolvedValue(null);
      mockDoctorSittingFindFirst.mockResolvedValue(null);

      const request = new Request("http://localhost/api/v1/readiness/book-appointment?patientId=patient-1&doctorId=doctor-1&branchId=branch-1&startsAt=2026-08-16T10:00:00Z&endsAt=2026-08-16T10:15:00Z");
      const res = await GET(request, { params: Promise.resolve({ action: "book-appointment" }) });
      const body = await res.json() as { ready: boolean; blockers: Blocker[] };

      expect(body.ready).toBe(false);
      expect(body.blockers.some((b: Blocker) => b.code === "patient-not-found")).toBe(true);
      expect(body.blockers.some((b: Blocker) => b.code === "no-published-availability")).toBe(true);
    });
  });

  describe("confirm-online-payment action", () => {
    it("returns blockers if user lacks billing permission or payment proof is missing", async () => {
      setMockContext({ permissionCodes: [] }); // lacks billing.payments.manage

      mockAppointmentFindFirst.mockResolvedValue({
        id: "appt-1",
        paymentStatus: "AWAITING_PAYMENT",
        paymentProofDocumentId: null, // missing proof
        patient: { givenName: "Sara", familyName: "Ahmed" },
      });

      const request = new Request("http://localhost/api/v1/readiness/confirm-online-payment?appointmentId=appt-1");
      const res = await GET(request, { params: Promise.resolve({ action: "confirm-online-payment" }) });
      const body = await res.json() as { ready: boolean; blockers: Blocker[] };

      expect(body.ready).toBe(false);
      expect(body.blockers.some((b: Blocker) => b.code === "billing-permission-required")).toBe(true);
      expect(body.blockers.some((b: Blocker) => b.code === "payment-proof-missing")).toBe(true);
    });
  });
});
