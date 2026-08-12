import { redirect } from "next/navigation";
export default async function Page({params}:Readonly<{params:Promise<{section:string}>}>):Promise<never>{const{section}=await params;redirect(`/doctor/${encodeURIComponent(section)}`)}
