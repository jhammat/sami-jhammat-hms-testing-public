import type {
  Metadata,
} from "next";

import {
  PracticeTeamManagement,
} from "@/components/team";

export const metadata:
  Metadata = {
    title:
      "Team and Permissions",
  };

export default function PracticeTeamPage() {
  return (
    <PracticeTeamManagement />
  );
}
