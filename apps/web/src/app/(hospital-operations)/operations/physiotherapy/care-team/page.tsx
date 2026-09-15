import { Suspense } from "react";

import { CareTeamWorkspace } from "@/components/clinical/care-team/care-team-workspace";

/**
 * The shared care-team record, inside this portal's own guard (the portal
 * layout above calls requirePortal). The data itself is protected again by the
 * care-timeline API's per-patient referral scope.
 */
export default function CareTeamPage() {
  // useSearchParams needs a Suspense boundary to prerender the page shell.
  return (
    <Suspense fallback={null}>
      <CareTeamWorkspace />
    </Suspense>
  );
}
