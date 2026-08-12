import {
  dispatchDiagnosticOrdersFromDocumentation,
} from "@/lib/diagnostics";
import {
  dispatchPharmacyPrescriptionFromDocumentation,
} from "@/lib/pharmacy";

import {
  completeDemoClinicalConsultation,
} from "./encounters";
import type {
  CompleteDemoClinicalConsultationResult,
} from "./encounters";
import {
  completeDemoClinicalDocumentation,
  validateDemoClinicalDocumentation,
} from "./documentation";
import type {
  DemoClinicalDocumentation,
  DemoClinicalDocumentationErrors,
} from "./documentation";

export type FinalizeDemoClinicalConsultationResult =
  | {
      ok: true;
      documentation: DemoClinicalDocumentation;
      lifecycle: Extract<
        CompleteDemoClinicalConsultationResult,
        { ok: true }
      >;
      dispatchedDiagnosticOrderCount: number;
      pharmacyPrescriptionDispatched: boolean;
    }
  | {
      ok: false;
      error: "documentation-invalid";
      validationErrors: DemoClinicalDocumentationErrors;
    }
  | {
      ok: false;
      error: Extract<
        CompleteDemoClinicalConsultationResult,
        { ok: false }
      >["error"];
    };

export function finalizeDemoClinicalConsultation(
  documentation: DemoClinicalDocumentation,
): FinalizeDemoClinicalConsultationResult {
  if (documentation.status !== "completed") {
    const validationErrors =
      validateDemoClinicalDocumentation(
        documentation,
      );

    if (
      Object.keys(validationErrors)
        .length > 0
    ) {
      return {
        ok: false,
        error: "documentation-invalid",
        validationErrors,
      };
    }
  }

  const completedDocumentation =
    documentation.status === "completed"
      ? documentation
      : completeDemoClinicalDocumentation(
          documentation,
        );

  const dispatchedDiagnosticOrders =
    dispatchDiagnosticOrdersFromDocumentation(
      completedDocumentation,
    );
  const dispatchedPharmacyCase =
    dispatchPharmacyPrescriptionFromDocumentation(
      completedDocumentation,
    );
  const lifecycle =
    completeDemoClinicalConsultation(
      completedDocumentation.encounterId,
    );

  if (!lifecycle.ok) {
    return {
      ok: false,
      error: lifecycle.error,
    };
  }

  return {
    ok: true,
    documentation:
      completedDocumentation,
    lifecycle,
    dispatchedDiagnosticOrderCount:
      dispatchedDiagnosticOrders.length,
    pharmacyPrescriptionDispatched:
      dispatchedPharmacyCase !==
      undefined,
  };
}
