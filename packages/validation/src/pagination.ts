import * as z from "zod";

import {
  codeSchema,
  searchTextSchema,
  sortDirectionSchema,
  wonFlowIdSchema,
} from "./primitives";

export const pageNumberInputSchema = z.coerce
  .number()
  .int("The page number must be a whole number.")
  .min(1, "The page number must be at least one.");

export const pageSizeInputSchema = z.coerce
  .number()
  .int("The page size must be a whole number.")
  .min(1, "The page size must be at least one.")
  .max(100, "A maximum of 100 records is allowed.");

export const paginationQuerySchema = z
  .object({
    page: pageNumberInputSchema.default(1),
    pageSize: pageSizeInputSchema.default(25),

    search: searchTextSchema.optional(),

    sortBy: codeSchema.optional(),
    sortDirection: sortDirectionSchema.default("asc"),
  })
  .strict();

export const cursorPaginationQuerySchema = z
  .object({
    cursor: wonFlowIdSchema.optional(),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(25),

    search: searchTextSchema.optional(),

    sortBy: codeSchema.optional(),
    sortDirection: sortDirectionSchema.default("asc"),
  })
  .strict();

export const paginationMetadataSchema = z
  .object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),

    totalItems: z.number().int().min(0),
    totalPages: z.number().int().min(0),

    hasPreviousPage: z.boolean(),
    hasNextPage: z.boolean(),
  })
  .strict();

export const cursorPaginationMetadataSchema = z
  .object({
    limit: z.number().int().min(1).max(100),

    nextCursor: wonFlowIdSchema.optional(),
    previousCursor: wonFlowIdSchema.optional(),

    hasMore: z.boolean(),
  })
  .strict();

export type PaginationQuery =
  z.output<typeof paginationQuerySchema>;

export type CursorPaginationQuery =
  z.output<typeof cursorPaginationQuerySchema>;

export type PaginationMetadata =
  z.output<typeof paginationMetadataSchema>;