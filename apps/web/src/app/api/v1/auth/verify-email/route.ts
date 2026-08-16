import{NextResponse}from"next/server";import{database}from"@wonflow/database";import{consumeOneTimeToken}from"@/lib/auth/one-time-token";
export async function POST(request:Request){const body=await request.json().catch(()=>null)as{token?:string}|null;if(!body?.token)return NextResponse.json({error:"Token is required."},{status:400});const token=await consumeOneTimeToken(body.token,"EMAIL_VERIFICATION");if(!token)return NextResponse.json({error:"The verification link is invalid or expired."},{status:400});
  // A public-website booking is created PENDING and held until the patient
  // proves the email is theirs — this is the moment that happens. Only
  // PENDING appointments booked through that specific route are touched, so
  // an unrelated PENDING booking (e.g. reception is still processing it)
  // is never silently confirmed by an unrelated email verification.
  const confirmedAppointmentIds:string[]=[];
  await database.$transaction(async tx=>{
    await tx.identity.update({where:{id:token.identityId},data:{emailVerifiedAt:new Date()}});
    await tx.auditEvent.create({data:{tenantId:token.tenantId,requestId:crypto.randomUUID(),action:"identity.email.verified",entityType:"identity",entityId:token.identityId,severity:"INFORMATION",sourceApplication:"web"}});
    const patientLinks=await tx.patientAccess.findMany({where:{identityId:token.identityId,isActive:true},select:{patientId:true}});
    if(patientLinks.length===0)return;
    const pending=await tx.appointment.findMany({where:{patientId:{in:patientLinks.map(link=>link.patientId)},status:"PENDING",source:"public-website"},select:{id:true,tenantId:true,branchId:true}});
    for(const appointment of pending){
      await tx.appointment.update({where:{id:appointment.id},data:{status:"CONFIRMED"}});
      await tx.auditEvent.create({data:{tenantId:appointment.tenantId,branchId:appointment.branchId,requestId:crypto.randomUUID(),action:"public.appointment.confirmed-by-email-verification",entityType:"appointment",entityId:appointment.id,severity:"INFORMATION",sourceApplication:"web"}});
      confirmedAppointmentIds.push(appointment.id);
    }
  });
  return NextResponse.json({ok:true,confirmedAppointmentIds})}
