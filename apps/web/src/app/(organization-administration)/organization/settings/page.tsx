import { redirect } from "next/navigation";
import { ORGANIZATION_POLICIES_PATH } from "@/lib/organization/organization-routes";
export default function Page():never{redirect(ORGANIZATION_POLICIES_PATH)}
