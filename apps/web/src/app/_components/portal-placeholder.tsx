import {
  getPortalDefinition,
} from "@wonflow/config";

type PortalCode =
  Parameters<typeof getPortalDefinition>[0];

import { Badge } from "@wonflow/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@wonflow/ui/components/card";

interface PortalPlaceholderProps {
  portalCode: PortalCode;
}

export function PortalPlaceholder({
  portalCode,
}: PortalPlaceholderProps) {
  const portal = getPortalDefinition(portalCode);

  return (
    <main
      className="min-h-screen bg-slate-50 p-6 md:p-10"
      data-portal={portal.code}
    >
      <Card className="mx-auto max-w-4xl border-slate-200 shadow-lg">
        <CardHeader className="space-y-4">
          <Badge
            variant="secondary"
            className="w-fit"
          >
            WonFlow Portal Route
          </Badge>

          <div className="space-y-2">
            <CardTitle className="text-3xl tracking-tight">
              {portal.name}
            </CardTitle>

            <CardDescription className="max-w-3xl text-base leading-7">
              {portal.description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-3">
          <section className="rounded-xl border bg-slate-50 p-4">
            <p className="text-sm text-muted-foreground">
              Public URL
            </p>

            <p className="mt-1 font-semibold">
              {portal.routePrefix}
            </p>
          </section>

          <section className="rounded-xl border bg-slate-50 p-4">
            <p className="text-sm text-muted-foreground">
              Internal route group
            </p>

            <p className="mt-1 font-semibold">
              {portal.routeGroup}
            </p>
          </section>

          <section className="rounded-xl border bg-slate-50 p-4">
            <p className="text-sm text-muted-foreground">
              Intended users
            </p>

            <p className="mt-1 font-semibold">
              {portal.intendedUsers.join(" · ")}
            </p>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}
