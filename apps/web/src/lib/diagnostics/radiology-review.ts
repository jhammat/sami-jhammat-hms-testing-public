import {
  readDemoStructuredRadiologyResults,
} from "./radiology-results";

import type {
  DemoStructuredRadiologyResult,
} from "./radiology-results";

export type DemoRadiologyResultSeverity =
  | "normal"
  | "abnormal"
  | "critical";

export type DemoRadiologyReviewStatus =
  | "pending"
  | "reviewed"
  | "abnormal-acknowledged";

export interface DemoRadiologyResultReview {
  id: string;

  structuredResultId: string;
  diagnosticOrderId: string;

  patientId: string;
  orderingPractitionerId: string;
  branchId: string;
  encounterId: string;

  severity:
    DemoRadiologyResultSeverity;

  status:
    DemoRadiologyReviewStatus;

  reviewerPractitionerId: string;
  reviewNote: string;

  createdAt: string;
  updatedAt: string;

  reviewedAt: string;
  abnormalAcknowledgedAt: string;
}

const RADIOLOGY_REVIEW_STORAGE_KEY =
  "wonflow-demo-radiology-result-reviews";

function createIdentifier(
  prefix: string,
): string {
  if (
    typeof globalThis.crypto
      ?.randomUUID === "function"
  ) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return [
    prefix,
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-");
}

export function getRadiologyResultSeverity(
  result:
    DemoStructuredRadiologyResult,
): DemoRadiologyResultSeverity {
  if (result.criticalFinding) {
    return "critical";
  }

  const abnormalResultExists =
    result.imageQuality !==
      "diagnostic" ||
    result.recommendations
      .trim() !== "";

  return abnormalResultExists
    ? "abnormal"
    : "normal";
}

export function readDemoRadiologyResultReviews():
  DemoRadiologyResultReview[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      RADIOLOGY_REVIEW_STORAGE_KEY,
    );

  if (storedValue === null) {
    return [];
  }

  try {
    const parsedValue:
      unknown =
      JSON.parse(storedValue);

    return Array.isArray(
      parsedValue,
    )
      ? parsedValue as
          DemoRadiologyResultReview[]
      : [];
  } catch {
    return [];
  }
}

export function writeDemoRadiologyResultReviews(
  reviews:
    readonly DemoRadiologyResultReview[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    RADIOLOGY_REVIEW_STORAGE_KEY,

    JSON.stringify(
      reviews.slice(0, 1000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-radiology-result-reviews-changed",
    ),
  );
}

export function createOrGetDemoRadiologyResultReview(
  result:
    DemoStructuredRadiologyResult,
): DemoRadiologyResultReview {
  const reviews =
    readDemoRadiologyResultReviews();

  const existingReview =
    reviews.find(
      (review) =>
        review.structuredResultId ===
        result.id,
    );

  if (
    existingReview !==
    undefined
  ) {
    return existingReview;
  }

  const timestamp =
    new Date().toISOString();

  const review:
    DemoRadiologyResultReview = {
    id:
      createIdentifier(
        "radiology-review",
      ),

    structuredResultId:
      result.id,

    diagnosticOrderId:
      result.diagnosticOrderId,

    patientId:
      result.patientId,

    orderingPractitionerId:
      result.practitionerId,

    branchId:
      result.branchId,

    encounterId:
      result.encounterId,

    severity:
      getRadiologyResultSeverity(
        result,
      ),

    status: "pending",

    reviewerPractitionerId: "",
    reviewNote: "",

    createdAt: timestamp,
    updatedAt: timestamp,

    reviewedAt: "",

    abnormalAcknowledgedAt:
      "",
  };

  writeDemoRadiologyResultReviews([
    review,
    ...reviews,
  ]);

  return review;
}

export function synchronizeFinalizedRadiologyResultReviews():
  DemoRadiologyResultReview[] {
  const finalizedResults =
    readDemoStructuredRadiologyResults()
      .filter(
        (result) =>
          result.status ===
          "finalized",
      );

  const existingReviews =
    readDemoRadiologyResultReviews();

  const existingResultIds =
    new Set(
      existingReviews.map(
        (review) =>
          review.structuredResultId,
      ),
    );

  const createdReviews:
    DemoRadiologyResultReview[] =
    [];

  finalizedResults.forEach(
    (result) => {
      if (
        existingResultIds.has(
          result.id,
        )
      ) {
        return;
      }

      createdReviews.push(
        createOrGetDemoRadiologyResultReview(
          result,
        ),
      );

      existingResultIds.add(
        result.id,
      );
    },
  );

  return createdReviews;
}

export function acknowledgeDemoRadiologyResultReview(
  input: {
    reviewId: string;

    reviewerPractitionerId:
      string;

    reviewNote: string;

    result:
      DemoStructuredRadiologyResult;
  },
): DemoRadiologyResultReview |
  undefined {
  const reviewerPractitionerId =
    input.reviewerPractitionerId
      .trim();

  const reviewNote =
    input.reviewNote.trim();

  if (
    reviewerPractitionerId ===
    ""
  ) {
    return undefined;
  }

  const severity =
    getRadiologyResultSeverity(
      input.result,
    );

  if (
    severity !== "normal" &&
    reviewNote.length < 3
  ) {
    return undefined;
  }

  const reviews =
    readDemoRadiologyResultReviews();

  const existingReview =
    reviews.find(
      (review) =>
        review.id ===
        input.reviewId,
    );

  if (
    existingReview ===
    undefined
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const updatedReview:
    DemoRadiologyResultReview = {
    ...existingReview,

    severity,

    status:
      severity === "normal"
        ? "reviewed"
        : "abnormal-acknowledged",

    reviewerPractitionerId,
    reviewNote,

    reviewedAt: timestamp,

    abnormalAcknowledgedAt:
      severity === "normal"
        ? ""
        : timestamp,

    updatedAt: timestamp,
  };

  writeDemoRadiologyResultReviews(
    reviews.map(
      (review) =>
        review.id ===
        updatedReview.id
          ? updatedReview
          : review,
    ),
  );

  return updatedReview;
}