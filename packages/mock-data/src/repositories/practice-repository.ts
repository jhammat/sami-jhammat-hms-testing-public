/**
 * Organization-scoped mutable repositories used by the practice mock
 * service.
 *
 * Organization scope is stored outside the domain value as well as in
 * organization-owned entities. This allows the repository to protect
 * older child contracts that are scoped through a parent record rather
 * than carrying organizationId themselves.
 *
 * No delete operation is exposed. Clinical and configuration history is
 * archived, revoked, cancelled or otherwise ended through domain state.
 */

import type {
  WonFlowId,
} from "@wonflow/contracts";

/**
 * Required tenant boundary for every repository operation.
 */
export interface PracticeRepositoryScope {
  organizationId: WonFlowId;
}

/**
 * Internal repository envelope.
 *
 * key is the stable identifier used by the service. It is usually the
 * entity's id, but PracticeAppointment uses appointmentId.
 */
export interface PracticeRepositoryRecord<
  TRecord,
> {
  organizationId: WonFlowId;

  key: WonFlowId;

  value: TRecord;
}

export interface PracticeRepositoryQuery<
  TRecord,
> {
  filter?: (
    record: Readonly<TRecord>,
  ) => boolean;

  sort?: (
    left: Readonly<TRecord>,
    right: Readonly<TRecord>,
  ) => number;

  offset?: number;

  limit?: number;
}

export interface PracticeRepositoryPage<
  TRecord,
> {
  items: TRecord[];

  totalItems: number;

  offset: number;

  limit: number;

  hasPreviousPage: boolean;

  hasNextPage: boolean;
}

export type PracticeRepositoryErrorCode =
  | "duplicate"
  | "not-found"
  | "scope-mismatch";

export class PracticeRepositoryError
  extends Error {
  public readonly code:
    PracticeRepositoryErrorCode;

  public constructor(
    code: PracticeRepositoryErrorCode,
    message: string,
  ) {
    super(message);

    this.name =
      "PracticeRepositoryError";

    this.code = code;
  }
}

export interface PracticeRepository<
  TRecord,
> {
  get(
    scope: PracticeRepositoryScope,
    key: WonFlowId,
  ): TRecord | undefined;

  list(
    scope: PracticeRepositoryScope,
    query?: PracticeRepositoryQuery<TRecord>,
  ): PracticeRepositoryPage<TRecord>;

  /** Platform-internal read across tenant envelopes. */
  listAcrossOrganizations(
    query?: PracticeRepositoryQuery<
      PracticeRepositoryRecord<TRecord>
    >,
  ): PracticeRepositoryPage<
    PracticeRepositoryRecord<TRecord>
  >;

  create(
    scope: PracticeRepositoryScope,
    key: WonFlowId,
    value: TRecord,
  ): TRecord;

  replace(
    scope: PracticeRepositoryScope,
    key: WonFlowId,
    value: TRecord,
  ): TRecord;

  exists(
    scope: PracticeRepositoryScope,
    key: WonFlowId,
  ): boolean;
}

function clonePracticeValue<TValue>(
  value: TValue,
): TValue {
  return structuredClone(value);
}

function normalizeOffset(
  value: number | undefined,
): number {
  if (value === undefined) {
    return 0;
  }

  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      "Repository offset must be a non-negative whole number.",
    );
  }

  return value;
}

function normalizeLimit(
  value: number | undefined,
): number {
  if (value === undefined) {
    return 25;
  }

  if (
    !Number.isInteger(value) ||
    value < 1
  ) {
    throw new Error(
      "Repository limit must be a positive whole number.",
    );
  }

  return Math.min(
    value,
    1_000,
  );
}

function createCompositeKey(
  organizationId: WonFlowId,
  key: WonFlowId,
): string {
  return `${organizationId}:${key}`;
}

/**
 * Mutable in-memory repository with a mandatory organization boundary.
 */
export class InMemoryPracticeRepository<
  TRecord,
> implements PracticeRepository<TRecord> {
  private readonly records =
    new Map<
      string,
      PracticeRepositoryRecord<TRecord>
    >();

  public get(
    scope: PracticeRepositoryScope,
    key: WonFlowId,
  ): TRecord | undefined {
    const stored =
      this.records.get(
        createCompositeKey(
          scope.organizationId,
          key,
        ),
      );

    if (stored === undefined) {
      return undefined;
    }

    if (
      stored.organizationId !==
      scope.organizationId
    ) {
      throw new PracticeRepositoryError(
        "scope-mismatch",
        "The record does not belong to the requested organization.",
      );
    }

    return clonePracticeValue(
      stored.value,
    );
  }

  public list(
    scope: PracticeRepositoryScope,
    query:
      PracticeRepositoryQuery<TRecord> = {},
  ): PracticeRepositoryPage<TRecord> {
    const offset =
      normalizeOffset(query.offset);

    const limit =
      normalizeLimit(query.limit);

    let selected =
      [...this.records.values()]
        .filter(
          (record) =>
            record.organizationId ===
            scope.organizationId,
        )
        .map(
          (record) =>
            clonePracticeValue(
              record.value,
            ),
        );

    if (query.filter !== undefined) {
      selected =
        selected.filter(
          query.filter,
        );
    }

    if (query.sort !== undefined) {
      selected =
        selected.sort(
          query.sort,
        );
    }

    const totalItems =
      selected.length;

    const items =
      selected.slice(
        offset,
        offset + limit,
      );

    return {
      items:
        clonePracticeValue(items),

      totalItems,

      offset,

      limit,

      hasPreviousPage:
        offset > 0,

      hasNextPage:
        offset + items.length <
        totalItems,
    };
  }

  public create(
    scope: PracticeRepositoryScope,
    key: WonFlowId,
    value: TRecord,
  ): TRecord {
    const compositeKey =
      createCompositeKey(
        scope.organizationId,
        key,
      );

    if (
      this.records.has(
        compositeKey,
      )
    ) {
      throw new PracticeRepositoryError(
        "duplicate",
        `A record already exists for key ${key}.`,
      );
    }

    const stored:
      PracticeRepositoryRecord<TRecord> = {
        organizationId:
          scope.organizationId,

        key,

        value:
          clonePracticeValue(value),
      };

    this.records.set(
      compositeKey,
      stored,
    );

    return clonePracticeValue(
      stored.value,
    );
  }

  public listAcrossOrganizations(
    query: PracticeRepositoryQuery<
      PracticeRepositoryRecord<TRecord>
    > = {},
  ): PracticeRepositoryPage<PracticeRepositoryRecord<TRecord>> {
    const offset = normalizeOffset(query.offset);
    const limit = normalizeLimit(query.limit);
    let selected = [...this.records.values()].map((record) =>
      clonePracticeValue(record),
    );
    if (query.filter !== undefined) {
      selected = selected.filter(query.filter);
    }
    if (query.sort !== undefined) {
      selected = selected.sort(query.sort);
    }
    const totalItems = selected.length;
    const items = selected.slice(offset, offset + limit);
    return {
      items: clonePracticeValue(items),
      totalItems,
      offset,
      limit,
      hasPreviousPage: offset > 0,
      hasNextPage: offset + items.length < totalItems,
    };
  }

  public replace(
    scope: PracticeRepositoryScope,
    key: WonFlowId,
    value: TRecord,
  ): TRecord {
    const compositeKey =
      createCompositeKey(
        scope.organizationId,
        key,
      );

    const current =
      this.records.get(
        compositeKey,
      );

    if (current === undefined) {
      throw new PracticeRepositoryError(
        "not-found",
        `No record exists for key ${key}.`,
      );
    }

    if (
      current.organizationId !==
      scope.organizationId
    ) {
      throw new PracticeRepositoryError(
        "scope-mismatch",
        "The record does not belong to the requested organization.",
      );
    }

    const replacement:
      PracticeRepositoryRecord<TRecord> = {
        organizationId:
          scope.organizationId,

        key,

        value:
          clonePracticeValue(value),
      };

    this.records.set(
      compositeKey,
      replacement,
    );

    return clonePracticeValue(
      replacement.value,
    );
  }

  public exists(
    scope: PracticeRepositoryScope,
    key: WonFlowId,
  ): boolean {
    return this.records.has(
      createCompositeKey(
        scope.organizationId,
        key,
      ),
    );
  }
}
