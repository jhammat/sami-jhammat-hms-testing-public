export function formatWonFlowDashboardMoney(
  minorUnits: number,
  currencyCode: string,
): string {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency:
        currencyCode,

      maximumFractionDigits: 0,
    },
  ).format(
    minorUnits / 100,
  );
}

export function formatWonFlowDashboardPercentage(
  value: number,
): string {
  return `${value.toFixed(1)}%`;
}

export function formatWonFlowDashboardDateTime(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(
    new Date(value),
  );
}

export function formatWonFlowDashboardTime(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(
    new Date(value),
  );
}