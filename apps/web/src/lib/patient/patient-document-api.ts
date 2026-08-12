import { NextResponse } from "next/server";
/** Fail closed until the server can resolve an authenticated patient-account link. */
export function patientDocumentAuthenticationRequired(){return NextResponse.json({error:"A linked patient account is required."},{status:401})}
