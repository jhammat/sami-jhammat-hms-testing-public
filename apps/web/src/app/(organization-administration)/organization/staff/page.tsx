import { redirect } from "next/navigation";
import { ORGANIZATION_TEAM_PATH } from "@/lib/organization/organization-routes";
export default function Page():never{redirect(ORGANIZATION_TEAM_PATH)}
