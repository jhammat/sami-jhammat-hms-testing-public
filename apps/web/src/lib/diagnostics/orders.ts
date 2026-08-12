import {
  readDemoClinicalDocumentation,
} from "../clinical/documentation";

import type {
  DemoClinicalDocumentation,
  DemoClinicalOrder,
} from "../clinical/documentation";

export type DemoDiagnosticOrderType =
  | "laboratory"
  | "radiology";

export type DemoDiagnosticOrderPriority =
  | "routine"
  | "urgent";

export type DemoDiagnosticOrderStatus =
  | "ordered"
  | "accepted"
  | "scheduled"
  | "specimen-collected"
  | "in-progress"
  | "result-ready"
  | "completed"
  | "cancelled";

export interface DemoDiagnosticOrder {
  id: string;

  orderNumber: string;
  accessionNumber?: string;

  sourceClinicalOrderId: string;

  clinicalDocumentationId: string;
  encounterId: string;

  patientId: string;
  practitionerId: string;
  branchId: string;

  orderType:
    DemoDiagnosticOrderType;

  orderName: string;

  priority:
    DemoDiagnosticOrderPriority;

  status:
    DemoDiagnosticOrderStatus;

  instructions: string;

  specimenType?: string;

  scheduledAt?: string;

  resultSummary: string;
  resultNotes: string;

  orderedAt: string;
  acceptedAt?: string;

  specimenCollectedAt?: string;
  processingStartedAt?: string;

  resultReadyAt?: string;
  completedAt?: string;
  cancelledAt?: string;

  updatedAt: string;
}

export type DiagnosticOrderStatusFilter =
  | "all"
  | DemoDiagnosticOrderStatus;

export interface DiagnosticOrderFilters {
  query: string;

  branchId: string;
  practitionerId: string;

  status:
    DiagnosticOrderStatusFilter;

  orderedDate: string;
}

const DEMO_DIAGNOSTIC_ORDER_STORAGE_KEY =
  "wonflow-demo-diagnostic-orders";

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

function padNumber(
  value: number,
): string {
  return String(value)
    .padStart(2, "0");
}

function generateDiagnosticOrderNumber(
  orderType:
    DemoDiagnosticOrderType,
): string {
  const currentDate =
    new Date();

  const datePart = [
    currentDate.getFullYear(),

    padNumber(
      currentDate.getMonth() + 1,
    ),

    padNumber(
      currentDate.getDate(),
    ),
  ].join("");

  const randomPart =
    Math.floor(
      1000 +
      Math.random() * 9000,
    );

  const prefix =
    orderType === "laboratory"
      ? "LAB"
      : "RAD";

  return `${prefix}-${datePart}-${randomPart}`;
}

function generateAccessionNumber(
  orderType:
    DemoDiagnosticOrderType,
): string {
  const currentDate =
    new Date();

  const datePart = [
    currentDate.getFullYear(),

    padNumber(
      currentDate.getMonth() + 1,
    ),

    padNumber(
      currentDate.getDate(),
    ),
  ].join("");

  const randomPart =
    Math.floor(
      10000 +
      Math.random() * 90000,
    );

  const prefix =
    orderType === "laboratory"
      ? "LACC"
      : "RACC";

  return `${prefix}-${datePart}-${randomPart}`;
}

function isDispatchableClinicalOrder(
  order:
    DemoClinicalOrder,
): order is
  DemoClinicalOrder & {
    type:
      DemoDiagnosticOrderType;
  } {
  return (
    (
      order.type ===
        "laboratory" ||
      order.type ===
        "radiology"
    ) &&
    order.orderName.trim() !==
      ""
  );
}

export function createInitialDiagnosticOrderFilters():
  DiagnosticOrderFilters {
  return {
    query: "",

    branchId: "all",
    practitionerId: "all",

    status: "all",

    orderedDate: "",
  };
}

export function readDemoDiagnosticOrders():
  DemoDiagnosticOrder[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const storedValue =
    window.localStorage.getItem(
      DEMO_DIAGNOSTIC_ORDER_STORAGE_KEY,
    );

  if (
    storedValue === null
  ) {
    return [];
  }

  try {
    const parsedValue:
      unknown =
      JSON.parse(
        storedValue,
      );

    if (
      !Array.isArray(
        parsedValue,
      )
    ) {
      return [];
    }

    return parsedValue as
      DemoDiagnosticOrder[];
  } catch {
    return [];
  }
}

export function writeDemoDiagnosticOrders(
  orders:
    readonly DemoDiagnosticOrder[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    DEMO_DIAGNOSTIC_ORDER_STORAGE_KEY,

    JSON.stringify(
      orders.slice(0, 1000),
    ),
  );

  window.dispatchEvent(
    new Event(
      "wonflow:demo-diagnostic-orders-changed",
    ),
  );
}

export function dispatchDiagnosticOrdersFromDocumentation(
  documentation:
    DemoClinicalDocumentation,
): DemoDiagnosticOrder[] {
  const existingOrders =
    readDemoDiagnosticOrders();

  const existingSourceOrderIds =
    new Set(
      existingOrders.map(
        (order) =>
          order.sourceClinicalOrderId,
      ),
    );

  const timestamp =
    documentation.completedAt ??
    documentation.updatedAt ??
    new Date().toISOString();

  const newOrders =
    documentation.orders
      .filter(
        isDispatchableClinicalOrder,
      )
      .filter(
        (order) =>
          !existingSourceOrderIds.has(
            order.id,
          ),
      )
      .map(
        (
          order,
        ): DemoDiagnosticOrder => ({
          id:
            createIdentifier(
              "diagnostic-order",
            ),

          orderNumber:
            generateDiagnosticOrderNumber(
              order.type,
            ),

          sourceClinicalOrderId:
            order.id,

          clinicalDocumentationId:
            documentation.id,

          encounterId:
            documentation.encounterId,

          patientId:
            documentation.patientId,

          practitionerId:
            documentation.practitionerId,

          branchId:
            documentation.branchId,

          orderType:
            order.type,

          orderName:
            order.orderName.trim(),

          priority:
            order.priority,

          status: "ordered",

          instructions:
            order.instructions.trim(),

          resultSummary: "",
          resultNotes: "",

          orderedAt:
            timestamp,

          updatedAt:
            timestamp,
        }),
      );

  if (
    newOrders.length === 0
  ) {
    return [];
  }

  writeDemoDiagnosticOrders([
    ...newOrders,
    ...existingOrders,
  ]);

  return newOrders;
}

export function dispatchAllCompletedDiagnosticOrders():
  DemoDiagnosticOrder[] {
  const completedDocumentation =
    readDemoClinicalDocumentation()
      .filter(
        (documentation) =>
          documentation.status ===
          "completed",
      );

  const dispatchedOrders:
    DemoDiagnosticOrder[] =
    [];

  completedDocumentation.forEach(
    (documentation) => {
      dispatchedOrders.push(
        ...dispatchDiagnosticOrdersFromDocumentation(
          documentation,
        ),
      );
    },
  );

  return dispatchedOrders;
}

function updateDiagnosticOrder(
  orderId: string,

  update:
    (
      order:
        DemoDiagnosticOrder,

      timestamp: string,
    ) =>
      DemoDiagnosticOrder |
      undefined,
): DemoDiagnosticOrder |
  undefined {
  const orders =
    readDemoDiagnosticOrders();

  const existingOrder =
    orders.find(
      (order) =>
        order.id === orderId,
    );

  if (
    existingOrder ===
    undefined
  ) {
    return undefined;
  }

  const timestamp =
    new Date().toISOString();

  const updatedOrder =
    update(
      existingOrder,
      timestamp,
    );

  if (
    updatedOrder === undefined
  ) {
    return undefined;
  }

  writeDemoDiagnosticOrders(
    orders.map(
      (order) =>
        order.id === orderId
          ? updatedOrder
          : order,
    ),
  );

  return updatedOrder;
}

export function acceptDemoDiagnosticOrder(
  orderId: string,
): DemoDiagnosticOrder |
  undefined {
  return updateDiagnosticOrder(
    orderId,

    (
      order,
      timestamp,
    ) => {
      if (
        order.status !==
        "ordered"
      ) {
        return undefined;
      }

      return {
        ...order,

        status: "accepted",

        accessionNumber:
          order.accessionNumber ??
          generateAccessionNumber(
            order.orderType,
          ),

        acceptedAt:
          timestamp,

        updatedAt:
          timestamp,
      };
    },
  );
}

export function collectDemoLaboratorySpecimen(
  orderId: string,
  specimenType: string,
): DemoDiagnosticOrder |
  undefined {
  const normalizedSpecimenType =
    specimenType.trim();

  if (
    normalizedSpecimenType ===
    ""
  ) {
    return undefined;
  }

  return updateDiagnosticOrder(
    orderId,

    (
      order,
      timestamp,
    ) => {
      if (
        order.orderType !==
          "laboratory" ||
        order.status !==
          "accepted"
      ) {
        return undefined;
      }

      return {
        ...order,

        specimenType:
          normalizedSpecimenType,

        status:
          "specimen-collected",

        specimenCollectedAt:
          timestamp,

        updatedAt:
          timestamp,
      };
    },
  );
}

export function scheduleDemoRadiologyOrder(
  orderId: string,
  scheduledAt: string,
): DemoDiagnosticOrder |
  undefined {
  const scheduledDate =
    new Date(scheduledAt);

  if (
    Number.isNaN(
      scheduledDate.getTime(),
    )
  ) {
    return undefined;
  }

  return updateDiagnosticOrder(
    orderId,

    (
      order,
      timestamp,
    ) => {
      if (
        order.orderType !==
          "radiology" ||
        order.status !==
          "accepted"
      ) {
        return undefined;
      }

      return {
        ...order,

        scheduledAt:
          scheduledDate.toISOString(),

        status: "scheduled",

        updatedAt:
          timestamp,
      };
    },
  );
}

export function startDemoDiagnosticOrder(
  orderId: string,
): DemoDiagnosticOrder |
  undefined {
  return updateDiagnosticOrder(
    orderId,

    (
      order,
      timestamp,
    ) => {
      const validLaboratoryStart =
        order.orderType ===
          "laboratory" &&
        order.status ===
          "specimen-collected";

      const validRadiologyStart =
        order.orderType ===
          "radiology" &&
        order.status ===
          "scheduled";

      if (
        !validLaboratoryStart &&
        !validRadiologyStart
      ) {
        return undefined;
      }

      return {
        ...order,

        status:
          "in-progress",

        processingStartedAt:
          timestamp,

        updatedAt:
          timestamp,
      };
    },
  );
}

export function saveDemoDiagnosticResult(
  orderId: string,
  resultSummary: string,
  resultNotes: string,
): DemoDiagnosticOrder |
  undefined {
  const normalizedResult =
    resultSummary.trim();

  if (
    normalizedResult.length < 2
  ) {
    return undefined;
  }

  return updateDiagnosticOrder(
    orderId,

    (
      order,
      timestamp,
    ) => {
      if (
        order.status !==
        "in-progress"
      ) {
        return undefined;
      }

      return {
        ...order,

        resultSummary:
          normalizedResult,

        resultNotes:
          resultNotes.trim(),

        status:
          "result-ready",

        resultReadyAt:
          timestamp,

        updatedAt:
          timestamp,
      };
    },
  );
}

export function finalizeDemoDiagnosticOrder(
  orderId: string,
): DemoDiagnosticOrder |
  undefined {
  return updateDiagnosticOrder(
    orderId,

    (
      order,
      timestamp,
    ) => {
      if (
        order.status !==
        "result-ready"
      ) {
        return undefined;
      }

      return {
        ...order,

        status: "completed",

        completedAt:
          timestamp,

        updatedAt:
          timestamp,
      };
    },
  );
}

export function cancelDemoDiagnosticOrder(
  orderId: string,
): DemoDiagnosticOrder |
  undefined {
  return updateDiagnosticOrder(
    orderId,

    (
      order,
      timestamp,
    ) => {
      if (
        order.status ===
          "completed" ||
        order.status ===
          "cancelled"
      ) {
        return undefined;
      }

      return {
        ...order,

        status: "cancelled",

        cancelledAt:
          timestamp,

        updatedAt:
          timestamp,
      };
    },
  );
}

export function filterDemoDiagnosticOrders(
  orders:
    readonly DemoDiagnosticOrder[],

  orderType:
    DemoDiagnosticOrderType,

  filters:
    DiagnosticOrderFilters,

  searchablePatientValues:
    ReadonlyMap<
      string,
      string
    >,

  searchablePractitionerValues:
    ReadonlyMap<
      string,
      string
    >,

  searchableBranchValues:
    ReadonlyMap<
      string,
      string
    >,
): DemoDiagnosticOrder[] {
  const normalizedQuery =
    filters.query
      .trim()
      .toLocaleLowerCase();

  return orders
    .filter(
      (order) => {
        if (
          order.orderType !==
          orderType
        ) {
          return false;
        }

        if (
          filters.branchId !==
            "all" &&
          order.branchId !==
            filters.branchId
        ) {
          return false;
        }

        if (
          filters.practitionerId !==
            "all" &&
          order.practitionerId !==
            filters.practitionerId
        ) {
          return false;
        }

        if (
          filters.status !==
            "all" &&
          order.status !==
            filters.status
        ) {
          return false;
        }

        if (
          filters.orderedDate !==
            "" &&
          order.orderedAt.slice(
            0,
            10,
          ) !==
            filters.orderedDate
        ) {
          return false;
        }

        if (
          normalizedQuery ===
          ""
        ) {
          return true;
        }

        const searchableText = [
          order.orderNumber,

          order.accessionNumber ??
            "",

          order.orderName,

          order.instructions,

          order.resultSummary,

          searchablePatientValues.get(
            order.patientId,
          ) ?? "",

          searchablePractitionerValues.get(
            order.practitionerId,
          ) ?? "",

          searchableBranchValues.get(
            order.branchId,
          ) ?? "",
        ]
          .join(" ")
          .toLocaleLowerCase();

        return searchableText.includes(
          normalizedQuery,
        );
      },
    )
    .sort(
      (
        left,
        right,
      ) => {
        const priorityRank:
          Record<
            DemoDiagnosticOrderPriority,
            number
          > = {
          urgent: 0,
          routine: 1,
        };

        const statusRank:
          Record<
            DemoDiagnosticOrderStatus,
            number
          > = {
          ordered: 0,
          accepted: 1,
          scheduled: 2,
          "specimen-collected": 2,
          "in-progress": 3,
          "result-ready": 4,
          completed: 5,
          cancelled: 6,
        };

        const statusDifference =
          statusRank[
            left.status
          ] -
          statusRank[
            right.status
          ];

        if (
          statusDifference !==
          0
        ) {
          return statusDifference;
        }

        const priorityDifference =
          priorityRank[
            left.priority
          ] -
          priorityRank[
            right.priority
          ];

        if (
          priorityDifference !==
          0
        ) {
          return priorityDifference;
        }

        return (
          new Date(
            left.orderedAt,
          ).getTime() -
          new Date(
            right.orderedAt,
          ).getTime()
        );
      },
    );
}