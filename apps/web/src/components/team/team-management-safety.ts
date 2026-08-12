import { hasPracticePrivilege, WONFLOW_PRACTICE_ROLE_DEFAULT_PRIVILEGES } from "@wonflow/contracts";
import type { IsoDateTime, PracticePrivilege, PracticeRoleCode, PracticeTeamMember, WonFlowId } from "@wonflow/contracts";
export interface ProposedPrivilegeOverride { privilege: PracticePrivilege; effect: "allow"|"deny"; }
export const PRACTICE_PRIVILEGE_DESCRIPTIONS: Readonly<Record<PracticePrivilege, string>> = {
  "dashboard.view": "View the practice dashboard.",
  "locations.view": "View practice locations.",
  "locations.manage": "Create and update practice locations.",
  "catalogue.view": "View the service catalogue and prices.",
  "catalogue.manage": "Create and update services, offerings, prices, and availability.",
  "team.view": "View team members and their access.",
  "team.manage": "Invite team members and change roles, permissions, and status.",
  "schedule.view": "View clinician schedules and availability.",
  "schedule.manage": "Change clinician schedules and availability.",
  "patients.view": "View patients assigned to the team member.",
  "patients.view-all": "View every patient in the practice.",
  "patients.assign": "Assign patients to team members.",
  "appointments.view": "View practice appointments.",
  "appointments.book": "Book appointments for patients.",
  "appointments.reschedule": "Reschedule appointments.",
  "appointments.cancel": "Cancel appointments.",
  "documents.view": "View patient documents allowed by the member's patient access.",
  "documents.upload": "Upload patient documents.",
  "documents.review": "Review patient documents.",
  "documents.release": "Release documents to patients.",
  "documents.request": "Request documents from patients.",
  "consultations.view": "View consultations allowed by the member's patient access.",
  "consultations.create": "Start consultations.",
  "consultations.edit": "Edit consultations.",
  "consultations.sign": "Sign consultations.",
  "consultations.countersign": "Countersign supervised consultations.",
  "consultations.release": "Release consultation records to patients.",
  "messages.view": "View practice messages.",
  "messages.reply": "Reply to practice messages.",
  "messages.assign": "Assign messages to team members.",
  "messages.manage-triage": "Manage message triage and routing.",
  "payments.view": "View payment records.",
  "payments.collect-offline": "Record payments collected outside WonFlow.",
  "payments.refund": "Refund payments.",
  "audit.view": "View the practice audit log.",
};
export function getPracticePrivilegeDescription(privilege: PracticePrivilege): string { return PRACTICE_PRIVILEGE_DESCRIPTIONS[privilege]; }
export function resolveProposedPracticePrivileges(roleCode: PracticeRoleCode, overrides: readonly ProposedPrivilegeOverride[]): PracticePrivilege[] { const privileges=new Set<PracticePrivilege>(WONFLOW_PRACTICE_ROLE_DEFAULT_PRIVILEGES[roleCode]); for(const item of overrides)if(item.effect==="allow")privileges.add(item.privilege); for(const item of overrides)if(item.effect==="deny")privileges.delete(item.privilege); return [...privileges]; }
export function getActivePracticeTeamManagers(members:readonly PracticeTeamMember[],at:IsoDateTime){return members.filter((member)=>hasPracticePrivilege(member,"team.manage",at));}
export interface WouldRemoveLastTeamManagerInput { members:readonly PracticeTeamMember[];targetMemberId:WonFlowId;nextPrivileges:readonly PracticePrivilege[];at:IsoDateTime; }
export function wouldRemoveLastActiveTeamManager({members,targetMemberId,nextPrivileges,at}:WouldRemoveLastTeamManagerInput){if(nextPrivileges.includes("team.manage"))return false;return !members.some((member)=>member.id!==targetMemberId&&hasPracticePrivilege(member,"team.manage",at));}
