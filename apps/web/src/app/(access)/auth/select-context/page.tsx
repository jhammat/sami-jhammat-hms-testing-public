import {
  getWonFlowPublicAppConfiguration,
} from "@/lib/config/public-app-config.server";

import {
  WorkspaceSelector,
} from "@/components/auth";

export default function Page() {
  const configuration =
    getWonFlowPublicAppConfiguration();

  return (
    <WorkspaceSelector
      productName={configuration.application.name}
    />
  );
}
