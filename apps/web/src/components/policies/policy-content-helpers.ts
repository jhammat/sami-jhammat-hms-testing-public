import type {
  TenantNotificationTemplateVariable,
} from "@wonflow/contracts";

export function readString(
  formData: FormData,
  key: string,
): string {
  return String(
    formData.get(key) ?? "",
  ).trim();
}

export function readOptionalString(
  formData: FormData,
  key: string,
): string | undefined {
  const value =
    readString(
      formData,
      key,
    );

  return value === ""
    ? undefined
    : value;
}

export function readInteger(
  formData: FormData,
  key: string,
): number {
  return Number.parseInt(
    readString(
      formData,
      key,
    ),
    10,
  );
}

export function readOptionalInteger(
  formData: FormData,
  key: string,
): number | undefined {
  const value =
    readOptionalString(
      formData,
      key,
    );

  return value === undefined
    ? undefined
    : Number.parseInt(
        value,
        10,
      );
}

export function readBoolean(
  formData: FormData,
  key: string,
): boolean {
  return (
    formData.get(key) ===
    "on"
  );
}

export function formatIssues(
  issues:
    readonly {
      message: string;
    }[],
): string {
  return issues
    .map(
      (issue) =>
        issue.message,
    )
    .join(" ");
}

export function titleCase(
  value: string,
): string {
  return value
    .split("-")
    .map(
      (part) =>
        part.length === 0
          ? part
          : `${part[0]?.toUpperCase()}${part.slice(1)}`,
    )
    .join(" ");
}

export function toIsoDateTime(
  value: string,
): string {
  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw new Error(
      "Enter a valid date and time.",
    );
  }

  return parsed.toISOString();
}

export function toOptionalIsoDateTime(
  value:
    string | undefined,
): string | undefined {
  return value === undefined
    ? undefined
    : toIsoDateTime(
        value,
      );
}

export function toDateTimeLocal(
  value:
    string | undefined,
): string {
  if (value === undefined) {
    return "";
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return "";
  }

  const offset =
    parsed.getTimezoneOffset() *
    60_000;

  return new Date(
    parsed.getTime() -
      offset,
  )
    .toISOString()
    .slice(0, 16);
}

export function formatDateTime(
  value:
    string | undefined,
): string {
  if (value === undefined) {
    return "Not set";
  }

  const parsed =
    new Date(value);

  return Number.isNaN(
    parsed.getTime(),
  )
    ? value
    : parsed.toLocaleString();
}

/**
 * Variable editor syntax:
 *
 * name|required|Description
 * name|optional|Description
 */
export function parseTemplateVariables(
  value: string,
): TenantNotificationTemplateVariable[] {
  const lines =
    value
      .split("\n")
      .map(
        (line) =>
          line.trim(),
      )
      .filter(Boolean);

  return lines.map(
    (line) => {
      const [
        rawName,
        rawRequirement,
        ...descriptionParts
      ] = line
        .split("|")
        .map(
          (part) =>
            part.trim(),
        );

      const name =
        rawName ?? "";

      if (name === "") {
        throw new Error(
          "Every template-variable line requires a name.",
        );
      }

      const requirement =
        rawRequirement
          ?.toLowerCase();

      if (
        requirement !==
          "required" &&
        requirement !==
          "optional"
      ) {
        throw new Error(
          `Variable "${name}" must use required or optional.`,
        );
      }

      const description =
        descriptionParts
          .join("|")
          .trim();

      return {
        name,

        required:
          requirement ===
          "required",

        description:
          description === ""
            ? undefined
            : description,
      };
    },
  );
}

export function formatTemplateVariables(
  variables:
    readonly TenantNotificationTemplateVariable[],
): string {
  return variables
    .map(
      (variable) =>
        [
          variable.name,

          variable.required
            ? "required"
            : "optional",

          variable.description ??
            "",
        ].join("|"),
    )
    .join("\n");
}

/**
 * Safe text preview.
 *
 * Variables are shown as named placeholders. No HTML is rendered.
 */
export function renderTemplatePreview(
  template: string,
): string {
  return template.replace(
    /\{\{\s*([A-Za-z][A-Za-z0-9_.-]*)\s*\}\}/g,
    (_match, variableName: string) =>
      `[${variableName}]`,
  );
}
