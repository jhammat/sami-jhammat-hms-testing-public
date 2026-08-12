import type{ReactNode}from"react";import{PhaseOneHero}from"@/components/phase-one-design";
export function ProfessionalOperationsHeader({area,title,description,actions}:{area:"Pharmacy"|"Billing"|"Laboratory"|"Radiology";title:string;description:string;actions?:ReactNode}){return <PhaseOneHero actions={actions} description={description} eyebrow={area} title={title}/>}
