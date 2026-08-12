export type PlatformTenantDestructiveAction = "suspend" | "reactivate" | "terminate";
export const PLATFORM_TENANT_CONFIRMATION_TEXT: Readonly<Record<PlatformTenantDestructiveAction,string>>={suspend:"SUSPEND",reactivate:"REACTIVATE",terminate:"TERMINATE"};
export function validatePlatformDestructiveReason(reason:string):string|undefined{return reason.trim().length<10?"Enter a specific reason of at least 10 characters.":undefined}
export function validatePlatformTypedConfirmation(action:PlatformTenantDestructiveAction,value:string):string|undefined{return value.trim()===PLATFORM_TENANT_CONFIRMATION_TEXT[action]?undefined:`Type ${PLATFORM_TENANT_CONFIRMATION_TEXT[action]} to continue.`}
export function isPlatformSupportAccessActive(input:{status:string;expiresAt:string},now:string):boolean{return input.status==="active"&&input.expiresAt>now}
