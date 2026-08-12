import {
  getWonFlowPublicAppConfiguration,
} from "@/lib/config/public-app-config.server";

import {
  AuthScreen,
} from "./auth-screen";

import type {
  AuthScreenKind,
} from "./auth-screen";

export function AuthPage({
  kind,
}: Readonly<{
  kind: AuthScreenKind;
}>) {
  const configuration =
    getWonFlowPublicAppConfiguration();

  return (
    <AuthScreen
      kind={kind}
      productName={configuration.application.name}
    />
  );
}
