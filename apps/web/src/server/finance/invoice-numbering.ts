import type { Prisma } from "@wonflow/database";

/**
 * Gapless, unique-per-tenant invoice numbers. Tenant.nextInvoiceNumber is a
 * single counter row incremented with `{ increment: 1 }`, which Postgres
 * compiles to an atomic UPDATE — the row lock serializes concurrent callers,
 * so two invoices issued at the same instant can never receive the same
 * number. Must run inside the same transaction as the Invoice creation so a
 * rolled-back invoice doesn't leave the sequence value stranded (this makes
 * the value dense as well as unique, not just unique).
 */
export async function nextInvoiceNumber(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
  const tenant = await tx.tenant.update({ where: { id: tenantId }, data: { nextInvoiceNumber: { increment: 1 } } });
  const sequence = tenant.nextInvoiceNumber - 1;
  const year = new Date().getUTCFullYear();
  return `INV-${year}-${String(sequence).padStart(6, "0")}`;
}
