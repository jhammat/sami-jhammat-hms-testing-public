import { redirect } from "next/navigation";
export default async function PatientDocumentUploadPage({searchParams}:{searchParams:Promise<{requestId?:string;returnTo?:string}>}){const query=await searchParams;const parameters=new URLSearchParams();if(query.requestId)parameters.set("requestId",query.requestId);redirect(`/patient/documents${parameters.size?`?${parameters}`:""}`)}
