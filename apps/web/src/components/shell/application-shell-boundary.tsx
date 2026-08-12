"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useWonFlowSession } from "@/app/_providers";

import { PremiumApplicationShell } from "./registration-legacy-shell";
import { ThemeToggle } from "./theme-toggle";

interface ApplicationShellBoundaryProps {
  children: ReactNode;
}

function isPublicOrAccessRoute(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/unauthorized" ||
    pathname === "/patient/register" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/book/")
  );
}

export function ApplicationShellBoundary({
  children,
}: ApplicationShellBoundaryProps) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useWonFlowSession();
  const requiresPasswordChange = session?.passwordChangeRequired === true && pathname !== "/auth/change-password";

  useEffect(() => {
    if (requiresPasswordChange) router.replace("/auth/change-password");
  }, [requiresPasswordChange, router]);

  if (requiresPasswordChange) return null;

  if (isPublicOrAccessRoute(pathname)) {
    return <>{children}<ThemeToggle floating /></>;
  }

  return (
    <PremiumApplicationShell>
      {children}
    </PremiumApplicationShell>
  );
}
