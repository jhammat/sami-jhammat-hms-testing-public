import type {
  WonFlowId,
} from "@wonflow/contracts";

export interface MockRepositoryEntity {
  id: WonFlowId;
}

export interface MockRepositoryQuery<TRecord> {
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

export interface MockRepositoryPage<TRecord> {
  items: TRecord[];

  totalItems: number;

  offset: number;
  limit: number;

  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface MockRepository<
  TRecord extends MockRepositoryEntity,
> {
  findById(
    id: WonFlowId,
  ): TRecord | undefined;

  findMany(
    query?: MockRepositoryQuery<TRecord>,
  ): MockRepositoryPage<TRecord>;

  count(
    filter?: (
      record: Readonly<TRecord>,
    ) => boolean,
  ): number;

  all(): TRecord[];
}

function cloneMockValue<TValue>(
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

export class InMemoryMockRepository<
  TRecord extends MockRepositoryEntity,
> implements MockRepository<TRecord> {
  private readonly records:
    readonly TRecord[];

  public constructor(
    records: readonly TRecord[],
  ) {
    this.records =
      cloneMockValue(records);
  }

  public findById(
    id: WonFlowId,
  ): TRecord | undefined {
    const record =
      this.records.find(
        (candidate) =>
          candidate.id === id,
      );

    if (record === undefined) {
      return undefined;
    }

    return cloneMockValue(record);
  }

  public findMany(
    query:
      MockRepositoryQuery<TRecord> = {},
  ): MockRepositoryPage<TRecord> {
    const offset =
      normalizeOffset(query.offset);

    const limit =
      normalizeLimit(query.limit);

    let selectedRecords =
      query.filter === undefined
        ? [...this.records]
        : this.records.filter(
            query.filter,
          );

    if (query.sort !== undefined) {
      selectedRecords =
        selectedRecords.sort(
          query.sort,
        );
    }

    const totalItems =
      selectedRecords.length;

    const items =
      selectedRecords.slice(
        offset,
        offset + limit,
      );

    return {
      items:
        cloneMockValue(items),

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

  public count(
    filter?: (
      record: Readonly<TRecord>,
    ) => boolean,
  ): number {
    if (filter === undefined) {
      return this.records.length;
    }

    return this.records.filter(
      filter,
    ).length;
  }

  public all(): TRecord[] {
    return cloneMockValue(
      [...this.records],
    );
  }
}
