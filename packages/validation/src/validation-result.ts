import * as z from "zod";

export interface WonFlowValidationIssue {
  path: Array<string | number>;
  field: string;

  code: string;
  message: string;
}

export type WonFlowValidationResult<TData> =
  | {
      success: true;
      data: TData;
      issues: [];
    }
  | {
      success: false;
      data?: never;
      issues: WonFlowValidationIssue[];
    };

function normalizePathSegment(
  segment: PropertyKey,
): string | number {
  if (typeof segment === "symbol") {
    return (
      segment.description ??
      segment.toString()
    );
  }

  return segment;
}

export function formatValidationPath(
  path: readonly PropertyKey[],
): string {
  if (path.length === 0) {
    return "_root";
  }

  let result = "";

  for (const segment of path) {
    const normalized =
      normalizePathSegment(segment);

    if (typeof normalized === "number") {
      result += `[${normalized}]`;
      continue;
    }

    if (result.length > 0) {
      result += ".";
    }

    result += normalized;
  }

  return result;
}

export function toWonFlowValidationIssues(
  error: z.ZodError,
): WonFlowValidationIssue[] {
  return error.issues.map((issue) => {
    const path = issue.path.map(
      normalizePathSegment,
    );

    return {
      path,
      field: formatValidationPath(issue.path),
      code: issue.code,
      message: issue.message,
    };
  });
}

export function validateWithSchema<
  TSchema extends z.ZodType,
>(
  schema: TSchema,
  input: unknown,
): WonFlowValidationResult<z.output<TSchema>> {
  const result = schema.safeParse(input);

  if (result.success) {
    return {
      success: true,
      data: result.data,
      issues: [],
    };
  }

  return {
    success: false,
    issues: toWonFlowValidationIssues(
      result.error,
    ),
  };
}

export async function validateWithSchemaAsync<
  TSchema extends z.ZodType,
>(
  schema: TSchema,
  input: unknown,
): Promise<
  WonFlowValidationResult<z.output<TSchema>>
> {
  const result =
    await schema.safeParseAsync(input);

  if (result.success) {
    return {
      success: true,
      data: result.data,
      issues: [],
    };
  }

  return {
    success: false,
    issues: toWonFlowValidationIssues(
      result.error,
    ),
  };
}