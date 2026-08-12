import type { Metadata } from "next";
import { PracticeTeamManagement, TeamRouteHeader } from "@/components/team";
export const metadata:Metadata={title:"Team and permissions | WonFlow",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export const revalidate=0;
export default function Page(){return <div id="main-content" className="min-w-0 space-y-6 overflow-x-clip"><TeamRouteHeader/><PracticeTeamManagement/></div>}
