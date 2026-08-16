import { redirect } from "next/navigation";

// The README's Phase 1 table lists /operations/billing as Billing's entry
// route, but billing has no single landing screen — it splits into "New
// Invoice" and "Refunds". This keeps that documented entry route real
// instead of 404ing, by sending it to the primary daily action.
export default function BillingIndexPage() {
  redirect("/operations/billing/new");
}
