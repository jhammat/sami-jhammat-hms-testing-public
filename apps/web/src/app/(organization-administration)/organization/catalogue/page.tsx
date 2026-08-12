import type { Metadata } from "next";
import { CatalogueRouteHeader, PracticeServiceCatalogueManagement } from "@/components/services";
export const metadata: Metadata = { title: "Service catalogue and fees | WonFlow", description: "Manage organization services, location offerings, fees and effective periods.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default function OrganizationCataloguePage() { return <div id="main-content" className="min-w-0 space-y-6 overflow-x-clip"><CatalogueRouteHeader/><PracticeServiceCatalogueManagement/></div>; }
