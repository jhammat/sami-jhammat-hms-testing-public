import type {
  Metadata,
} from "next";

import {
  PracticePolicyContentManagement,
} from "@/components/policies";

export const metadata:
  Metadata = {
    title:
      "Policies and Content",
  };

export default function PracticePoliciesPage() {
  return (
    <PracticePolicyContentManagement />
  );
}
