"use client";

import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import type { WonFlowSessionPayload } from "@/lib/auth/session";

const WonFlowSessionContext = createContext<
  WonFlowSessionPayload | null | undefined
>(undefined);

export interface WonFlowSessionProviderProps {
  session: WonFlowSessionPayload | null;
  children: ReactNode;
}

export function WonFlowSessionProvider({
  session,
  children,
}: WonFlowSessionProviderProps) {
  const value = useMemo(() => session, [session]);

  return (
    <WonFlowSessionContext.Provider value={value}>
      {children}
    </WonFlowSessionContext.Provider>
  );
}

export function useWonFlowSession(): WonFlowSessionPayload | null {
  const context = useContext(WonFlowSessionContext);

  if (context === undefined) {
    throw new Error(
      "useWonFlowSession must be used inside WonFlowSessionProvider.",
    );
  }

  return context;
}
