import type { PracticeMoney } from "@wonflow/contracts";
export function formatPracticeMoney(money: PracticeMoney, locale = "en-PK") {
  const currency = money.currencyCode.trim().toUpperCase();
  if (currency === "") return String(money.amountMinorUnits);
  try { return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(money.amountMinorUnits / 100); }
  catch { return `${currency} ${(money.amountMinorUnits / 100).toFixed(2)}`; }
}
