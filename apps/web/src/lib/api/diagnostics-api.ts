import{phaseOneApi}from"./phase-one-api";export type DiagnosticWorkspaceType="LABORATORY"|"RADIOLOGY";
export const getDiagnosticWorklist=(type:DiagnosticWorkspaceType,date:string)=>phaseOneApi<{orders:unknown[]}>(`/api/v1/diagnostics/worklist?type=${type}&date=${encodeURIComponent(date)}`);
export const saveDiagnosticResult=(orderId:string,input:{resultId?:string;resultData?:unknown;reportText?:string;critical?:boolean;criticalNotes?:string;version?:number})=>phaseOneApi(`/api/v1/diagnostics/orders/${orderId}/result`,{method:"PUT",body:JSON.stringify(input)});
export const releaseDiagnosticResult=(orderId:string,resultId:string)=>phaseOneApi(`/api/v1/diagnostics/orders/${orderId}/result/${resultId}/release`,{method:"POST",body:JSON.stringify({})});
