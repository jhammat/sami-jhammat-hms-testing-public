import type { Metadata } from "next";
import { PracticePolicyContentManagement } from "@/components/policies";
import { PolicyContentRouteHeader } from "@/components/settings";
export const metadata:Metadata={title:"Policies and content | WonFlow",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export const revalidate=0;
export default function Page(){return <div id="main-content" className="space-y-6 overflow-x-clip"><PolicyContentRouteHeader/><PracticePolicyContentManagement/></div>}
