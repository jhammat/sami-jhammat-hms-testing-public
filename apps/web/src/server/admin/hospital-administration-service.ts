import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

import { database } from "@wonflow/database";
import type { Prisma, ServiceBillingOwner, WorkspaceCode } from "@wonflow/database";
import { requirePermission, requireTenantContext } from "@wonflow/contracts";
import type { WonFlowRequestContext, WonFlowTenantRequestContext } from "@wonflow/contracts";
import { hashPassword } from "@/lib/auth/password";
import { ensureWorkspaceRoles } from "@/server/access/workspace-roles";
import { getServiceCategory, isServiceCategoryCode, isServiceCategoryEntitled } from "@/lib/services/service-categories";
import { nextSequentialCode, nextServiceCode, normalizeServiceCode, serviceCodePrefix } from "@/lib/services/service-code";
import { isWorkspaceEntitled, readEnabledModules } from "@/server/access/workspace-modules";
import { WonFlowApiError } from "@/server/http/route-handler";
import { documentObjectPath, persistUploadedDocumentBytes } from "@/server/documents/document-storage";

const audit = (tx: Parameters<Parameters<typeof database.$transaction>[0]>[0], c: WonFlowTenantRequestContext, action: string, entityType: string, entityId: string, severity: "INFORMATION"|"WARNING"|"CRITICAL" = "INFORMATION") =>
  tx.auditEvent.create({ data: { tenantId: c.tenantId, branchId: c.branchId, actorMembershipId: c.userId, sessionId: c.sessionId, requestId: c.requestId, action, entityType, entityId, severity, sourceApplication: c.sourceApplication } });

const isUniqueConstraintError = (caught: unknown) => typeof caught === "object" && caught !== null && (caught as { code?: string }).code === "P2002";

const ADMIN_PERMISSION_CODES = ["organization.audit.read","organization.branches.manage","organization.profile.manage","organization.profile.read","organization.roles.manage","organization.roles.read","organization.schedules.manage","organization.schedules.read","organization.services.manage","organization.services.read","organization.users.manage","organization.users.read"] as const;

export class HospitalAdministrationService {
  private context(c: WonFlowRequestContext) { return requireTenantContext(c); }
  async getConfiguration(rc: WonFlowRequestContext) { const c=this.context(rc); requirePermission(c,"organization.profile.read"); return database.organization.findFirst({ where:{id:c.organizationId,tenantId:c.tenantId},include:{branches:{where:{archivedAt:null},orderBy:[{isMainBranch:"desc"},{name:"asc"}]}}}); }
  async updateOrganization(rc: WonFlowRequestContext,input:{displayName:string;legalName?:string;email?:string;phone?:string;website?:string;logoObjectKey?:string;settings?:object}) { const c=this.context(rc); requirePermission(c,"organization.profile.manage"); return database.$transaction(async tx=>{ const entity=await tx.organization.update({where:{id:c.organizationId},data:{displayName:input.displayName.trim(),legalName:input.legalName?.trim()||null,email:input.email?.trim()||null,phone:input.phone?.trim()||null,website:input.website?.trim()||null,logoObjectKey:input.logoObjectKey??null,settings:input.settings}}); await audit(tx,c,"organization.profile.updated","organization",entity.id); return entity;}); }
  async listBranches(rc:WonFlowRequestContext){const c=this.context(rc);requirePermission(c,"organization.profile.read");return database.branch.findMany({where:{tenantId:c.tenantId,organizationId:c.organizationId,archivedAt:null},orderBy:[{isMainBranch:"desc"},{name:"asc"}]});}
  async createBranch(rc:WonFlowRequestContext,input:{code:string;name:string;isMainBranch?:boolean;timezone?:string;currencyCode?:string;email?:string;phone?:string;address?:object}) { const c=this.context(rc);requirePermission(c,"organization.branches.manage");return database.$transaction(async tx=>{if(input.isMainBranch)await tx.branch.updateMany({where:{tenantId:c.tenantId,organizationId:c.organizationId,isMainBranch:true},data:{isMainBranch:false}});const entity=await tx.branch.create({data:{tenantId:c.tenantId,organizationId:c.organizationId,code:input.code.trim().toUpperCase(),name:input.name.trim(),isMainBranch:input.isMainBranch??false,timezone:input.timezone??c.timezone,currencyCode:input.currencyCode??c.currencyCode,email:input.email?.trim()||null,phone:input.phone?.trim()||null,address:input.address}});await audit(tx,c,"organization.branch.created","branch",entity.id);return entity;}); }
  async updateBranch(rc:WonFlowRequestContext,id:string,input:{code?:string;name?:string;isMainBranch?:boolean;timezone?:string;currencyCode?:string;email?:string|null;phone?:string|null;status?:"ACTIVE"|"INACTIVE"}){
    const c=this.context(rc);requirePermission(c,"organization.branches.manage");
    const branch=await database.branch.findFirst({where:{id,tenantId:c.tenantId,organizationId:c.organizationId,archivedAt:null}});
    if(!branch)throw new WonFlowApiError(404,"branch-not-found","The branch could not be found.");
    if(input.name!==undefined&&!input.name.trim())throw new WonFlowApiError(400,"invalid-branch-name","Enter a branch name.");
    if(input.code!==undefined&&!input.code.trim())throw new WonFlowApiError(400,"invalid-branch-code","Enter a branch code.");
    if(input.isMainBranch===false&&branch.isMainBranch)throw new WonFlowApiError(400,"main-branch-required","Promote another branch to main instead of clearing this one. A hospital must always have exactly one main branch.");
    if(input.status==="INACTIVE"&&branch.isMainBranch)throw new WonFlowApiError(400,"main-branch-required","The main branch cannot be deactivated. Promote another branch to main first.");
    return database.$transaction(async tx=>{
      if(input.isMainBranch===true&&!branch.isMainBranch)await tx.branch.updateMany({where:{tenantId:c.tenantId,organizationId:c.organizationId,isMainBranch:true},data:{isMainBranch:false}});
      const entity=await tx.branch.update({where:{id,tenantId:c.tenantId},data:{
        ...(input.code!==undefined?{code:input.code.trim().toUpperCase()}:{}),
        ...(input.name!==undefined?{name:input.name.trim()}:{}),
        ...(input.isMainBranch!==undefined?{isMainBranch:input.isMainBranch}:{}),
        ...(input.timezone!==undefined?{timezone:input.timezone.trim()}:{}),
        ...(input.currencyCode!==undefined?{currencyCode:input.currencyCode.trim().toUpperCase()}:{}),
        ...(input.email!==undefined?{email:input.email?.trim()||null}:{}),
        ...(input.phone!==undefined?{phone:input.phone?.trim()||null}:{}),
        ...(input.status!==undefined?{status:input.status}:{}),
      }});
      await audit(tx,c,"organization.branch.updated","branch",entity.id);
      return entity;
    });
  }
  async archiveBranch(rc:WonFlowRequestContext,id:string){
    const c=this.context(rc);requirePermission(c,"organization.branches.manage");
    const branch=await database.branch.findFirst({where:{id,tenantId:c.tenantId,organizationId:c.organizationId,archivedAt:null}});
    if(!branch)throw new WonFlowApiError(404,"branch-not-found","The branch could not be found.");
    if(branch.isMainBranch)throw new WonFlowApiError(400,"main-branch-protected","The main branch cannot be deleted. Promote another branch to main first.");
    const [staffCount,upcomingAppointments]=await Promise.all([
      database.staffProfile.count({where:{tenantId:c.tenantId,branchId:id,status:"ACTIVE"}}),
      database.appointment.count({where:{tenantId:c.tenantId,branchId:id,startsAt:{gte:new Date()},status:{notIn:["CANCELLED","COMPLETED"]}}}),
    ]);
    if(staffCount>0)throw new WonFlowApiError(409,"branch-has-staff",`Reassign ${staffCount} active staff ${staffCount===1?"member":"members"} before deleting this branch.`);
    if(upcomingAppointments>0)throw new WonFlowApiError(409,"branch-has-appointments",`This branch has ${upcomingAppointments} upcoming ${upcomingAppointments===1?"appointment":"appointments"}. Cancel or move them before deleting it.`);
    return database.$transaction(async tx=>{
      await tx.availabilityRule.updateMany({where:{tenantId:c.tenantId,branchId:id},data:{isActive:false}});
      const entity=await tx.branch.update({where:{id,tenantId:c.tenantId},data:{status:"ARCHIVED",archivedAt:new Date()}});
      await audit(tx,c,"organization.branch.deleted","branch",entity.id,"WARNING");
      return entity;
    });
  }
  // Departments are structural hospital configuration, so they reuse the
  // branch-management permission rather than introducing a new seeded code.
  async listDepartments(rc:WonFlowRequestContext){
    const c=this.context(rc);requirePermission(c,"organization.profile.read");
    return database.department.findMany({
      where:{tenantId:c.tenantId,organizationId:c.organizationId,archivedAt:null},
      include:{branch:{select:{id:true,name:true}},_count:{select:{doctors:true}}},
      orderBy:[{isActive:"desc"},{name:"asc"}],
    });
  }
  async createDepartment(rc:WonFlowRequestContext,input:{code:string;name:string;description?:string;branchId?:string}){
    const c=this.context(rc);requirePermission(c,"organization.branches.manage");
    const code=input.code?.trim().toUpperCase();const name=input.name?.trim();
    if(!code)throw new WonFlowApiError(400,"invalid-department-code","Enter a department code.");
    if(!name)throw new WonFlowApiError(400,"invalid-department-name","Enter a department name.");
    if(await database.department.findFirst({where:{tenantId:c.tenantId,code}}))throw new WonFlowApiError(409,"duplicate-department-code","A department already uses that code.");
    if(input.branchId&&!await database.branch.findFirst({where:{id:input.branchId,tenantId:c.tenantId,organizationId:c.organizationId,archivedAt:null}}))throw new WonFlowApiError(400,"invalid-department-branch","Select a branch in this hospital.");
    return database.$transaction(async tx=>{const entity=await tx.department.create({data:{tenantId:c.tenantId,organizationId:c.organizationId,branchId:input.branchId||null,code,name,description:input.description?.trim()||null}});await audit(tx,c,"organization.department.created","department",entity.id);return entity;});
  }
  async updateDepartment(rc:WonFlowRequestContext,id:string,input:{code?:string;name?:string;description?:string|null;branchId?:string|null;isActive?:boolean}){
    const c=this.context(rc);requirePermission(c,"organization.branches.manage");
    const department=await database.department.findFirst({where:{id,tenantId:c.tenantId,organizationId:c.organizationId,archivedAt:null}});
    if(!department)throw new WonFlowApiError(404,"department-not-found","The department could not be found.");
    if(input.name!==undefined&&!input.name.trim())throw new WonFlowApiError(400,"invalid-department-name","Enter a department name.");
    if(input.code!==undefined){const code=input.code.trim().toUpperCase();if(!code)throw new WonFlowApiError(400,"invalid-department-code","Enter a department code.");if(code!==department.code&&await database.department.findFirst({where:{tenantId:c.tenantId,code}}))throw new WonFlowApiError(409,"duplicate-department-code","A department already uses that code.");}
    if(input.branchId&&!await database.branch.findFirst({where:{id:input.branchId,tenantId:c.tenantId,organizationId:c.organizationId,archivedAt:null}}))throw new WonFlowApiError(400,"invalid-department-branch","Select a branch in this hospital.");
    return database.$transaction(async tx=>{const entity=await tx.department.update({where:{id},data:{
      ...(input.code!==undefined?{code:input.code.trim().toUpperCase()}:{}),
      ...(input.name!==undefined?{name:input.name.trim()}:{}),
      ...(input.description!==undefined?{description:input.description?.trim()||null}:{}),
      ...(input.branchId!==undefined?{branchId:input.branchId||null}:{}),
      ...(input.isActive!==undefined?{isActive:input.isActive}:{}),
    }});await audit(tx,c,"organization.department.updated","department",entity.id);return entity;});
  }
  async archiveDepartment(rc:WonFlowRequestContext,id:string){
    const c=this.context(rc);requirePermission(c,"organization.branches.manage");
    const department=await database.department.findFirst({where:{id,tenantId:c.tenantId,organizationId:c.organizationId,archivedAt:null}});
    if(!department)throw new WonFlowApiError(404,"department-not-found","The department could not be found.");
    const doctorCount=await database.doctorProfile.count({where:{tenantId:c.tenantId,departmentId:id}});
    if(doctorCount>0)throw new WonFlowApiError(409,"department-has-doctors",`Move ${doctorCount} ${doctorCount===1?"doctor":"doctors"} to another department before deleting this one.`);
    return database.$transaction(async tx=>{const entity=await tx.department.update({where:{id},data:{isActive:false,archivedAt:new Date()}});await audit(tx,c,"organization.department.deleted","department",entity.id,"WARNING");return entity;});
  }
  async listUsers(rc:WonFlowRequestContext){
    const c=this.context(rc);
    requirePermission(c,"organization.users.read");
    const memberships=await database.tenantMembership.findMany({
      where:{tenantId:c.tenantId,organizationId:c.organizationId,archivedAt:null},
      include:{
        identity:{select:{email:true,phone:true,status:true}},
        primaryBranch:true,
        roles:{include:{role:true}},
        staffProfile:{
          select:{
            id:true,
            title:true,
            employeeNumber:true,
            doctor:{
              select:{
                id:true,
                specialty:true,
                registrationNumber:true,
                durationMinutes:true,
                publiclyBookable:true,
                qualifications:true,
                biography:true,
                contactPhone:true,
                department:{select:{id:true,name:true,code:true}},
                services:{
                  where:{category:"CONSULTATION",isActive:true},
                  select:{id:true,name:true,priceMinorUnits:true,durationMinutes:true,publiclyBookable:true},
                  take:1
                }
              }
            }
          }
        }
      },
      orderBy:{displayName:"asc"}
    });
    return memberships.map(({staffProfile,...membership})=>({
      ...membership,
      staffProfile:staffProfile?{id:staffProfile.id,title:staffProfile.title,employeeNumber:staffProfile.employeeNumber}:null,
      doctorProfile:staffProfile?.doctor?{
        id:staffProfile.doctor.id,
        specialty:staffProfile.doctor.specialty,
        registrationNumber:staffProfile.doctor.registrationNumber,
        durationMinutes:staffProfile.doctor.durationMinutes,
        publiclyBookable:staffProfile.doctor.publiclyBookable,
        qualifications:staffProfile.doctor.qualifications,
        biography:staffProfile.doctor.biography,
        contactPhone:staffProfile.doctor.contactPhone,
        department:staffProfile.doctor.department,
        services:staffProfile.doctor.services
      }:null
    }));
  }
  async inviteUser(rc:WonFlowRequestContext,input:{email:string;displayName:string;primaryBranchId?:string;departmentId?:string;department?:string;workspaceCodes?:Array<"ADMIN"|"RECEPTION"|"DOCTOR"|"PATIENT"|"LABORATORY"|"RADIOLOGY"|"PHARMACY"|"BILLING"|"MANAGEMENT"|"PHYSIOTHERAPIST"|"NUTRITIONIST">}){
    const c=this.context(rc);requirePermission(c,"organization.users.manage");
    if(input.primaryBranchId&&!await database.branch.findFirst({where:{id:input.primaryBranchId,tenantId:c.tenantId,organizationId:c.organizationId}}))throw new Error("Branch does not belong to this organization.");
    // Doctors are attached to a configured department record, selected inline
    // on the invite form rather than typed into a prompt.
    const selectedDepartment=input.departmentId?await database.department.findFirst({where:{id:input.departmentId,tenantId:c.tenantId,organizationId:c.organizationId,archivedAt:null,isActive:true}}):null;
    if(input.departmentId&&!selectedDepartment)throw new WonFlowApiError(400,"invalid-department","Select a department configured for this hospital.");
    const normalizedEmail=input.email.trim().toLowerCase();
    const workspaceCodes=input.workspaceCodes??[];

    // The invite screen only OFFERS entitled workspaces, but hiding an option
    // is not authorization -- this request can be replayed with any workspace
    // code in it. A tenant that has not licensed a module must not be able to
    // mint a login for it, so the entitlement is checked here as well.
    const enabledModules=await readEnabledModules(c.tenantId);
    const forbidden=workspaceCodes.filter(code=>!isWorkspaceEntitled(code,enabledModules));
    if(forbidden.length>0){
      throw new WonFlowApiError(
        403,
        "workspace-not-entitled",
        `This hospital is not licensed for the ${forbidden.join(", ").toLowerCase()} workspace. Ask your platform administrator to enable that module, then invite this person again.`,
      );
    }
    const existingIdentity = await database.identity.findUnique({
      where: { normalizedEmail },
      select: { id: true, email: true, passwordHash: true },
    });

    const existingMembership = existingIdentity
      ? await database.tenantMembership.findFirst({
          where: { tenantId: c.tenantId, identityId: existingIdentity.id, archivedAt: null },
        })
      : null;

    if (existingIdentity?.passwordHash) {
      // The user already has a login. Attach or add workspaces to their account without resetting their password.
      await database.$transaction(async (tx) => {
        const mergedWorkspaceCodes = Array.from(
          new Set([...(existingMembership?.workspaceCodes ?? []), ...workspaceCodes]),
        ) as WorkspaceCode[];

        const membership = await tx.tenantMembership.upsert({
          where: { tenantId_identityId: { tenantId: c.tenantId, identityId: existingIdentity.id } },
          create: {
            tenantId: c.tenantId,
            identityId: existingIdentity.id,
            organizationId: c.organizationId,
            primaryBranchId: input.primaryBranchId ?? null,
            displayName: input.displayName.trim(),
            workspaceCodes: mergedWorkspaceCodes,
            status: "ACTIVE",
          },
          update: {
            displayName: input.displayName.trim(),
            primaryBranchId: input.primaryBranchId ?? undefined,
            workspaceCodes: mergedWorkspaceCodes,
            status: "ACTIVE",
          },
        });

        await ensureWorkspaceRoles(tx, c.tenantId, mergedWorkspaceCodes);
        const workspaceRoles = await tx.role.findMany({
          where: { tenantId: c.tenantId, code: { in: mergedWorkspaceCodes }, isActive: true, archivedAt: null },
          select: { id: true, code: true },
        });

        if (mergedWorkspaceCodes.includes("ADMIN")) {
          const adminRole = workspaceRoles.find((r) => r.code === "ADMIN");
          if (adminRole) {
            for (const code of ADMIN_PERMISSION_CODES) {
              const permission = await tx.permission.upsert({
                where: { code },
                create: { code, category: "organization", label: code },
                update: {},
              });
              await tx.rolePermission.upsert({
                where: {
                  tenantId_roleId_permissionId: { tenantId: c.tenantId, roleId: adminRole.id, permissionId: permission.id },
                },
                create: { tenantId: c.tenantId, roleId: adminRole.id, permissionId: permission.id, effect: "ALLOW" },
                update: { effect: "ALLOW" },
              });
            }
          }
        }

        const assignedRoleIds = new Set(
          (
            await tx.membershipRole.findMany({
              where: { tenantId: c.tenantId, membershipId: membership.id },
              select: { roleId: true },
            })
          ).map((assignment) => assignment.roleId),
        );

        for (const role of workspaceRoles) {
          if (!assignedRoleIds.has(role.id)) {
            await tx.membershipRole.create({
              data: {
                tenantId: c.tenantId,
                membershipId: membership.id,
                roleId: role.id,
                branchId: input.primaryBranchId ?? null,
              },
            });
          }
        }

        if (mergedWorkspaceCodes.includes("DOCTOR") && selectedDepartment) {
          const staff = await tx.staffProfile.upsert({
            where: { membershipId: membership.id },
            create: {
              tenantId: c.tenantId,
              membershipId: membership.id,
              branchId: input.primaryBranchId ?? null,
              employeeNumber: `DR-${membership.id.slice(0, 8).toUpperCase()}`,
              staffType: "DOCTOR",
            },
            update: { branchId: input.primaryBranchId ?? null, staffType: "DOCTOR", status: "ACTIVE" },
          });

          await tx.doctorProfile.upsert({
            where: { staffProfileId: staff.id },
            create: {
              tenantId: c.tenantId,
              staffProfileId: staff.id,
              departmentId: selectedDepartment.id,
              specialty: selectedDepartment.name,
            },
            update: { departmentId: selectedDepartment.id, specialty: selectedDepartment.name },
          });
        }

        await audit(tx, c, "organization.user.workspaces_updated", "membership", membership.id, "INFORMATION");
      });

      return {
        mode: "EXISTING_ACCOUNT" as const,
        invitation: null,
        email: existingIdentity.email,
        temporaryPassword: "",
      };
    }

    const result = await database.$transaction(async (tx) => {
      const identity = await tx.identity.upsert({
        where: { normalizedEmail },
        create: { email: input.email.trim(), normalizedEmail, status: "INVITED" },
        update: {},
      });
      const membership = await tx.tenantMembership.upsert({
        where: { tenantId_identityId: { tenantId: c.tenantId, identityId: identity.id } },
        create: {
          tenantId: c.tenantId,
          identityId: identity.id,
          organizationId: c.organizationId,
          primaryBranchId: input.primaryBranchId ?? null,
          displayName: input.displayName.trim(),
          workspaceCodes,
          status: "INVITED",
        },
        update: { displayName: input.displayName.trim(), primaryBranchId: input.primaryBranchId ?? null, workspaceCodes },
      });
      // Tenants provisioned before workspace roles existed only have ADMIN, so
      // create the invited workspace's role (with its permissions) on demand.
      await ensureWorkspaceRoles(tx, c.tenantId, workspaceCodes);
      const workspaceRoles = await tx.role.findMany({
        where: { tenantId: c.tenantId, code: { in: workspaceCodes }, isActive: true, archivedAt: null },
        select: { id: true, code: true },
      });
      if (workspaceCodes.includes("ADMIN")) {
        const adminRole = workspaceRoles.find((r) => r.code === "ADMIN");
        if (adminRole) {
          for (const code of ADMIN_PERMISSION_CODES) {
            const permission = await tx.permission.upsert({
              where: { code },
              create: { code, category: "organization", label: code },
              update: {},
            });
            await tx.rolePermission.upsert({
              where: {
                tenantId_roleId_permissionId: { tenantId: c.tenantId, roleId: adminRole.id, permissionId: permission.id },
              },
              create: { tenantId: c.tenantId, roleId: adminRole.id, permissionId: permission.id, effect: "ALLOW" },
              update: { effect: "ALLOW" },
            });
          }
        }
      }
      const assignedRoleIds = new Set(
        (
          await tx.membershipRole.findMany({
            where: { tenantId: c.tenantId, membershipId: membership.id },
            select: { roleId: true },
          })
        ).map((assignment) => assignment.roleId),
      );
      for (const role of workspaceRoles) {
        if (!assignedRoleIds.has(role.id)) {
          await tx.membershipRole.create({
            data: { tenantId: c.tenantId, membershipId: membership.id, roleId: role.id, branchId: input.primaryBranchId ?? null },
          });
        }
      }
      if (workspaceCodes.includes("DOCTOR")) {
        const staff = await tx.staffProfile.upsert({
          where: { membershipId: membership.id },
          create: {
            tenantId: c.tenantId,
            membershipId: membership.id,
            branchId: input.primaryBranchId ?? null,
            employeeNumber: `DR-${membership.id.slice(0, 8).toUpperCase()}`,
            staffType: "DOCTOR",
          },
          update: { branchId: input.primaryBranchId ?? null, staffType: "DOCTOR", status: "ACTIVE" },
        });
        const specialty = selectedDepartment?.name ?? input.department?.trim();
        if (!selectedDepartment) throw new WonFlowApiError(400, "doctor-department-required", "Select the doctor's department.");
        await tx.doctorProfile.upsert({
          where: { staffProfileId: staff.id },
          create: { tenantId: c.tenantId, staffProfileId: staff.id, departmentId: selectedDepartment.id, specialty },
          update: { departmentId: selectedDepartment.id, specialty },
        });
      }
      const invitation = await tx.tenantInvitation.create({
        data: {
          tenantId: c.tenantId,
          normalizedEmail,
          displayName: input.displayName.trim(),
          organizationId: c.organizationId,
          primaryBranchId: input.primaryBranchId ?? null,
          workspaceCodes,
          invitedByMembershipId: c.userId,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        },
      });
      await audit(tx, c, "organization.user.invited", "invitation", invitation.id);
      return { identity, membership, invitation };
    });

    const temporaryPassword = `Wf7!${randomBytes(9).toString("base64url")}`;
    const passwordHash = await hashPassword(temporaryPassword);
    await database.$transaction(async (tx) => {
      await tx.identity.update({
        where: { id: result.identity.id },
        data: { passwordHash, status: "ACTIVE", mustChangePassword: true, passwordChangedAt: new Date() },
      });
      await tx.tenantMembership.update({ where: { id: result.membership.id }, data: { status: "ACTIVE" } });
      await tx.tenantInvitation.update({
        where: { id: result.invitation.id },
        data: { status: "ACTIVE", acceptedIdentityId: result.identity.id, acceptedAt: new Date() },
      });
      await audit(tx, c, "organization.staff-credentials.issued", "membership", result.membership.id, "WARNING");
    });
    return { mode: "TEMPORARY_PASSWORD" as const, invitation: result.invitation, email: result.identity.email, temporaryPassword };
  }

  async updateUserWorkspaces(
    rc: WonFlowRequestContext,
    membershipId: string,
    input: {
      workspaceCodes: WorkspaceCode[];
      departmentId?: string | null;
      primaryBranchId?: string | null;
    },
  ) {
    const c = this.context(rc);
    requirePermission(c, "organization.users.manage");

    const membership = await database.tenantMembership.findFirst({
      where: { id: membershipId, tenantId: c.tenantId, organizationId: c.organizationId, archivedAt: null },
      include: { identity: true },
    });
    if (!membership) {
      throw new WonFlowApiError(404, "hospital-user-not-found", "The hospital user could not be found.");
    }

    if (!input.workspaceCodes || input.workspaceCodes.length === 0) {
      throw new WonFlowApiError(400, "workspace-required", "A user must have at least one workspace assigned.");
    }

    const enabledModules = await readEnabledModules(c.tenantId);
    const forbidden = input.workspaceCodes.filter((code) => !isWorkspaceEntitled(code, enabledModules));
    if (forbidden.length > 0) {
      throw new WonFlowApiError(
        403,
        "workspace-not-entitled",
        `This hospital is not licensed for the ${forbidden.join(", ").toLowerCase()} workspace.`,
      );
    }

    let selectedDepartment: { id: string; name: string } | null = null;
    if (input.workspaceCodes.includes("DOCTOR")) {
      if (input.departmentId) {
        selectedDepartment = await database.department.findFirst({
          where: { id: input.departmentId, tenantId: c.tenantId, organizationId: c.organizationId, archivedAt: null, isActive: true },
        });
      }
      if (!selectedDepartment) {
        const existingStaff = await database.staffProfile.findUnique({
          where: { membershipId: membership.id },
          include: { doctor: { include: { department: true } } },
        });
        selectedDepartment = existingStaff?.doctor?.department ?? null;
      }
      if (!selectedDepartment) {
        throw new WonFlowApiError(400, "doctor-department-required", "Select a department for the doctor workspace.");
      }
    }

    return database.$transaction(async (tx) => {
      await ensureWorkspaceRoles(tx, c.tenantId, input.workspaceCodes);
      const roles = await tx.role.findMany({
        where: { tenantId: c.tenantId, code: { in: input.workspaceCodes }, isActive: true, archivedAt: null },
        select: { id: true, code: true },
      });

      if (input.workspaceCodes.includes("ADMIN")) {
        const adminRole = roles.find((r) => r.code === "ADMIN");
        if (adminRole) {
          for (const code of ADMIN_PERMISSION_CODES) {
            const permission = await tx.permission.upsert({
              where: { code },
              create: { code, category: "organization", label: code },
              update: {},
            });
            await tx.rolePermission.upsert({
              where: { tenantId_roleId_permissionId: { tenantId: c.tenantId, roleId: adminRole.id, permissionId: permission.id } },
              create: { tenantId: c.tenantId, roleId: adminRole.id, permissionId: permission.id, effect: "ALLOW" },
              update: { effect: "ALLOW" },
            });
          }
        }
      }

      const updatedMembership = await tx.tenantMembership.update({
        where: { id: membership.id },
        data: {
          workspaceCodes: input.workspaceCodes,
          primaryBranchId: input.primaryBranchId !== undefined ? input.primaryBranchId : membership.primaryBranchId,
        },
      });

      const targetRoleIds = new Set(roles.map((r) => r.id));
      await tx.membershipRole.deleteMany({
        where: {
          tenantId: c.tenantId,
          membershipId: membership.id,
          roleId: { notIn: Array.from(targetRoleIds) },
        },
      });

      const existingRoleAssignments = await tx.membershipRole.findMany({
        where: { tenantId: c.tenantId, membershipId: membership.id },
        select: { roleId: true },
      });
      const existingRoleIds = new Set(existingRoleAssignments.map((a) => a.roleId));

      for (const role of roles) {
        if (!existingRoleIds.has(role.id)) {
          await tx.membershipRole.create({
            data: {
              tenantId: c.tenantId,
              membershipId: membership.id,
              roleId: role.id,
              branchId: input.primaryBranchId !== undefined ? input.primaryBranchId : membership.primaryBranchId,
            },
          });
        }
      }

      if (input.workspaceCodes.includes("DOCTOR") && selectedDepartment) {
        const staff = await tx.staffProfile.upsert({
          where: { membershipId: membership.id },
          create: {
            tenantId: c.tenantId,
            membershipId: membership.id,
            branchId: input.primaryBranchId !== undefined ? input.primaryBranchId : membership.primaryBranchId,
            employeeNumber: `DR-${membership.id.slice(0, 8).toUpperCase()}`,
            staffType: "DOCTOR",
            status: "ACTIVE",
          },
          update: {
            branchId: input.primaryBranchId !== undefined ? input.primaryBranchId : membership.primaryBranchId,
            staffType: "DOCTOR",
            status: "ACTIVE",
          },
        });
        await tx.doctorProfile.upsert({
          where: { staffProfileId: staff.id },
          create: {
            tenantId: c.tenantId,
            staffProfileId: staff.id,
            departmentId: selectedDepartment.id,
            specialty: selectedDepartment.name,
          },
          update: {
            departmentId: selectedDepartment.id,
            specialty: selectedDepartment.name,
          },
        });
      }

      await audit(tx, c, "organization.user.workspaces_updated", "membership", membership.id, "INFORMATION");
      return updatedMembership;
    });
  }

  async updateUser(rc:WonFlowRequestContext,id:string,input:{status?:"INVITED"|"ACTIVE"|"SUSPENDED"|"ARCHIVED";displayName?:string;primaryBranchId?:string|null;title?:string|null;email?:string;phone?:string|null}){
    const c=this.context(rc);
    requirePermission(c,"organization.users.manage");
    if(input.primaryBranchId){
      const branch=await database.branch.findFirst({where:{id:input.primaryBranchId,tenantId:c.tenantId,organizationId:c.organizationId}});
      if(!branch)throw new WonFlowApiError(400,"invalid-branch","Branch does not belong to this organization.");
    }
    const membership = await database.tenantMembership.findFirst({
      where: { id, tenantId: c.tenantId, organizationId: c.organizationId, archivedAt: null },
      include: { identity: true, staffProfile: true },
    });
    if (!membership) throw new WonFlowApiError(404, "user-not-found", "User not found.");

    return database.$transaction(async tx=>{
      if (input.email && input.email.trim().toLowerCase() !== membership.identity.email.toLowerCase()) {
        const normalizedEmail = input.email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
          throw new WonFlowApiError(400, "invalid-email-address", "Enter a valid email address.");
        }
        const existing = await tx.identity.findFirst({
          where: { normalizedEmail, id: { not: membership.identityId } },
        });
        if (existing) {
          throw new WonFlowApiError(409, "email-in-use", `The email address ${input.email} is already in use.`);
        }
        await tx.identity.update({
          where: { id: membership.identityId },
          data: { email: input.email.trim(), normalizedEmail, ...(input.phone !== undefined ? { phone: input.phone?.trim() || null } : {}) },
        });
      } else if (input.phone !== undefined) {
        await tx.identity.update({
          where: { id: membership.identityId },
          data: { phone: input.phone?.trim() || null },
        });
      }

      if (membership.staffProfile && (input.title !== undefined || input.primaryBranchId !== undefined)) {
        await tx.staffProfile.update({
          where: { id: membership.staffProfile.id },
          data: {
            ...(input.title !== undefined ? { title: input.title?.trim() || null } : {}),
            ...(input.primaryBranchId !== undefined ? { branchId: input.primaryBranchId } : {}),
          },
        });
      }

      if (input.primaryBranchId !== undefined) {
        await tx.membershipRole.updateMany({
          where: { tenantId: c.tenantId, membershipId: membership.id },
          data: { branchId: input.primaryBranchId || null },
        });
      }

      const entity=await tx.tenantMembership.update({
        where:{id,tenantId:c.tenantId},
        data:{
          ...(input.displayName !== undefined ? { displayName: input.displayName.trim() } : {}),
          ...(input.primaryBranchId !== undefined ? { primaryBranchId: input.primaryBranchId } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        }
      });
      await audit(tx,c,"organization.user.updated","membership",entity.id,input.status==="SUSPENDED"?"WARNING":"INFORMATION");
      return entity;
    });
  }
  async archiveUser(rc:WonFlowRequestContext,id:string){const c=this.context(rc);requirePermission(c,"organization.users.manage");if(id===c.membershipId)throw new WonFlowApiError(400,"cannot-remove-current-user","You cannot remove your own active hospital access.");const membership=await database.tenantMembership.findFirst({where:{id,tenantId:c.tenantId,organizationId:c.organizationId,archivedAt:null}});if(!membership)throw new WonFlowApiError(404,"hospital-user-not-found","The hospital user could not be found.");return database.$transaction(async tx=>{const archived=await tx.tenantMembership.update({where:{id:membership.id},data:{status:"ARCHIVED",archivedAt:new Date(),workspaceCodes:[]}});await tx.staffProfile.updateMany({where:{membershipId:membership.id},data:{status:"ARCHIVED"}});await tx.authSession.updateMany({where:{membershipId:membership.id,status:"ACTIVE"},data:{status:"REVOKED",revokedAt:new Date(),revocationReason:"hospital-access-removed"}});await tx.oneTimeToken.updateMany({where:{identityId:membership.identityId,tenantId:c.tenantId,status:"ACTIVE"},data:{status:"REVOKED"}});await audit(tx,c,"organization.user.archived","membership",membership.id,"WARNING");return archived;});}
  async resetUserPassword(rc:WonFlowRequestContext,id:string){const c=this.context(rc);requirePermission(c,"organization.users.manage");if(id===c.membershipId)throw new WonFlowApiError(400,"use-own-password-change","Use your account settings to change your own password.");const membership=await database.tenantMembership.findFirst({where:{id,tenantId:c.tenantId,organizationId:c.organizationId,status:{in:["ACTIVE","INVITED"]},archivedAt:null},include:{identity:{include:{memberships:{where:{status:"ACTIVE"},select:{tenantId:true}}}}}});if(!membership)throw new WonFlowApiError(404,"hospital-user-not-found","The hospital user could not be found.");if(membership.identity.memberships.some((item)=>item.tenantId!==c.tenantId))throw new WonFlowApiError(409,"shared-account-password-reset","This identity belongs to more than one tenant and must use self-service password recovery.");const temporaryPassword=`Wf7!${randomBytes(9).toString("base64url")}`,passwordHash=await hashPassword(temporaryPassword);await database.$transaction(async tx=>{await tx.identity.update({where:{id:membership.identityId},data:{passwordHash,mustChangePassword:true,passwordChangedAt:null,status:"ACTIVE",failedLoginCount:0,lockedUntil:null}});await tx.tenantMembership.update({where:{id:membership.id},data:{status:"ACTIVE"}});await tx.authSession.updateMany({where:{identityId:membership.identityId,status:"ACTIVE"},data:{status:"REVOKED",revokedAt:new Date(),revocationReason:"administrator-password-reset"}});await tx.oneTimeToken.updateMany({where:{identityId:membership.identityId,status:"ACTIVE"},data:{status:"REVOKED"}});await audit(tx,c,"organization.user.password-reset","membership",membership.id,"WARNING");});return{email:membership.identity.email,temporaryPassword};}
  async listRoles(rc:WonFlowRequestContext){const c=this.context(rc);requirePermission(c,"organization.roles.read");return database.role.findMany({where:{tenantId:c.tenantId},include:{permissions:{include:{permission:true}}},orderBy:{name:"asc"}});}
  async createRole(rc:WonFlowRequestContext,input:{code:string;name:string;description?:string;permissionCodes:string[]}){const c=this.context(rc);requirePermission(c,"organization.roles.manage");return database.$transaction(async tx=>{const permissions=await tx.permission.findMany({where:{code:{in:input.permissionCodes}}});if(permissions.length!==new Set(input.permissionCodes).size)throw new Error("One or more permission codes are invalid.");const entity=await tx.role.create({data:{tenantId:c.tenantId,code:input.code.trim().toLowerCase(),name:input.name.trim(),description:input.description?.trim()||null,permissions:{create:permissions.map(p=>({tenantId:c.tenantId,permissionId:p.id,effect:"ALLOW"}))}},include:{permissions:{include:{permission:true}}}});await audit(tx,c,"organization.role.created","role",entity.id);return entity;});}
  /** permissionCodes, when given, replaces this role's entire grant set — every membership holding the role sees the new grants on its very next request, since permissions are never cached across requests. */
  async updateRole(rc:WonFlowRequestContext,id:string,input:{name?:string;description?:string;isActive?:boolean;permissionCodes?:string[]}){const c=this.context(rc);requirePermission(c,"organization.roles.manage");return database.$transaction(async tx=>{
    const entity=await tx.role.update({where:{id,tenantId:c.tenantId},data:{name:input.name?.trim(),description:input.description?.trim(),isActive:input.isActive}});
    if(input.permissionCodes){
      const permissions=await tx.permission.findMany({where:{code:{in:input.permissionCodes}}});
      if(permissions.length!==new Set(input.permissionCodes).size)throw new WonFlowApiError(400,"invalid-permission-code","One or more permission codes are invalid.");
      await tx.rolePermission.deleteMany({where:{tenantId:c.tenantId,roleId:id}});
      if(permissions.length)await tx.rolePermission.createMany({data:permissions.map(p=>({tenantId:c.tenantId,roleId:id,permissionId:p.id,effect:"ALLOW"}))});
    }
    await audit(tx,c,"organization.role.updated","role",entity.id);
    return tx.role.findUnique({where:{id},include:{permissions:{include:{permission:true}}}});
  });}
  /** Replaces a membership's entire role assignment set in one transaction — never a partial add/remove that could leave a stale grant behind. */
  async assignMembershipRoles(rc:WonFlowRequestContext,membershipId:string,roleIds:string[]){const c=this.context(rc);requirePermission(c,"organization.users.manage");
    const membership=await database.tenantMembership.findFirst({where:{id:membershipId,tenantId:c.tenantId,organizationId:c.organizationId,archivedAt:null}});
    if(!membership)throw new WonFlowApiError(404,"membership-not-found","The staff member could not be found.");
    const roles=roleIds.length?await database.role.findMany({where:{id:{in:roleIds},tenantId:c.tenantId}}):[];
    if(roles.length!==new Set(roleIds).size)throw new WonFlowApiError(400,"invalid-role","One or more roles could not be found.");
    return database.$transaction(async tx=>{
      await tx.membershipRole.deleteMany({where:{tenantId:c.tenantId,membershipId}});
      if(roles.length)await tx.membershipRole.createMany({data:roles.map(role=>({tenantId:c.tenantId,membershipId,roleId:role.id,branchId:membership.primaryBranchId}))});
      await audit(tx,c,"organization.user.roles-changed","membership",membershipId);
      return tx.tenantMembership.findUnique({where:{id:membershipId},include:{roles:{include:{role:true}}}});
    });
  }
  async getOnboardingState(rc:WonFlowRequestContext){const c=this.context(rc);requirePermission(c,"organization.profile.read");const state=await database.tenantOnboardingState.findUnique({where:{tenantId:c.tenantId}});return state??{tenantId:c.tenantId,currentStep:"profile",steps:{}};}
  /** The only place onboarding progress is written — never the browser, so starting on one device and resuming on another always sees the same state. */
  async updateOnboardingState(rc:WonFlowRequestContext,input:{currentStep:string;steps:Record<string,unknown>}){const c=this.context(rc);requirePermission(c,"organization.profile.manage");if(!input.currentStep?.trim())throw new WonFlowApiError(400,"onboarding-step-required","A current step is required.");const steps=input.steps as Prisma.InputJsonValue;return database.tenantOnboardingState.upsert({where:{tenantId:c.tenantId},create:{tenantId:c.tenantId,currentStep:input.currentStep,steps},update:{currentStep:input.currentStep,steps}});}
  async listDoctors(rc:WonFlowRequestContext){
    const c=this.context(rc);
    requirePermission(c,"organization.users.read");
    return database.doctorProfile.findMany({
      where:{tenantId:c.tenantId,staffProfile:{membership:{organizationId:c.organizationId,archivedAt:null}}},
      include:{
        staffProfile:{
          include:{
            membership:{
              include:{
                identity:{select:{email:true,phone:true,status:true}}
              }
            },
            branch:true
          }
        },
        department:{select:{id:true,name:true,code:true}},
        services: {
          where: {
            isActive: true,
            category: { in: ["CONSULTATION", "Consultation", "consultation"] },
          },
          select: { id: true, code: true, name: true, priceMinorUnits: true, durationMinutes: true, publiclyBookable: true, category: true },
          orderBy: { createdAt: "asc" },
        }
      },
      orderBy:{staffProfile:{membership:{displayName:"asc"}}}
    });
  }
  async listServices(rc:WonFlowRequestContext){const c=this.context(rc);requirePermission(c,"organization.services.read");return database.serviceDefinition.findMany({where:{tenantId:c.tenantId,isActive:true},include:{branch:true,handlerMembership:{select:{id:true,displayName:true,primaryWorkspace:true}},doctor:{include:{staffProfile:{include:{membership:true}}}},feeHistory:{orderBy:{changedAt:"desc"},take:10}},orderBy:{name:"asc"}});}
  /** Staff who can be named as the person operating a service. */
  async listServiceHandlers(rc:WonFlowRequestContext){
    const c=this.context(rc);requirePermission(c,"organization.services.read");
    return database.tenantMembership.findMany({
      where:{tenantId:c.tenantId,organizationId:c.organizationId,archivedAt:null,status:{in:["ACTIVE","INVITED"]}},
      select:{id:true,displayName:true,primaryWorkspace:true,workspaceCodes:true},
      orderBy:{displayName:"asc"},
    });
  }
  async updateDoctorFeeAuthority(rc:WonFlowRequestContext,authority:"DOCTOR"|"HOSPITAL"|"APPROVAL_REQUIRED"){
    const c=this.context(rc);requirePermission(c,"organization.services.manage");
    return database.$transaction(async tx=>{const organization=await tx.organization.update({where:{id:c.organizationId,tenantId:c.tenantId},data:{doctorFeeAuthority:authority}});await audit(tx,c,"organization.doctor-fee-authority.updated","organization",organization.id,"WARNING");return organization;});
  }
  /** Next unused sequential code for a category, e.g. `LAB-004`, across active and archived services. */
  private async allocateServiceCode(tenantId:string,category:string){
    const existing=await database.serviceDefinition.findMany({where:{tenantId,code:{startsWith:`${serviceCodePrefix(category)}-`}},select:{code:true}});
    return nextServiceCode(category,existing.map(service=>service.code));
  }
  async createService(rc:WonFlowRequestContext,input:{branchId?:string;handlerWorkspace?:WorkspaceCode;handlerMembershipId?:string;doctorId?:string;code?:string;name:string;category:string;description?:string;durationMinutes:number;priceMinorUnits?:number;currencyCode?:string;publiclyBookable?:boolean;billingOwner?:ServiceBillingOwner;consultationModes?:("IN_PERSON"|"ONLINE")[]}){
    const c=this.context(rc);requirePermission(c,"organization.services.manage");
    if(!input.name?.trim()||!input.category?.trim())throw new WonFlowApiError(400,"service-details-required","Enter a service name and category.");
    if (!isServiceCategoryCode(input.category)) throw new WonFlowApiError(400, "invalid-service-category", "Select a valid hospital service category.");
    const enabledModules = await readEnabledModules(c.tenantId);
    if (!isServiceCategoryEntitled(input.category, enabledModules)) {
      throw new WonFlowApiError(403, "category-not-entitled", `The ${getServiceCategory(input.category)?.label ?? input.category} service category is not enabled for this hospital.`);
    }
    if (input.handlerWorkspace && !isWorkspaceEntitled(input.handlerWorkspace, enabledModules)) {
      throw new WonFlowApiError(403, "workspace-not-entitled", "The selected handler workspace is not enabled for this hospital.");
    }
    const requestedCode=input.code?.trim()?normalizeServiceCode(input.code):null;
    if(requestedCode!==null&&!/^[A-Z0-9][A-Z0-9-]{1,49}$/.test(requestedCode))throw new WonFlowApiError(400,"invalid-service-code","A custom service code uses 2-50 letters, digits and hyphens.");
    if(!Number.isInteger(input.durationMinutes)||input.durationMinutes<5||input.durationMinutes>480)throw new WonFlowApiError(400,"invalid-service-duration","Duration must be between 5 and 480 minutes.");
    if(input.priceMinorUnits!==undefined&&(!Number.isInteger(input.priceMinorUnits)||input.priceMinorUnits<0))throw new WonFlowApiError(400,"invalid-service-price","Enter a valid service price.");
    const organization=await database.organization.findFirst({where:{id:c.organizationId,tenantId:c.tenantId},select:{doctorFeeAuthority:true}});
    if(!organization)throw new WonFlowApiError(404,"organization-not-found","The hospital organization could not be found.");
    if(input.branchId&&!await database.branch.findFirst({where:{id:input.branchId,tenantId:c.tenantId,organizationId:c.organizationId}}))throw new WonFlowApiError(400,"invalid-service-branch","Branch does not belong to this organization.");
    if(input.doctorId&&!await database.doctorProfile.findFirst({where:{id:input.doctorId,tenantId:c.tenantId,staffProfile:{membership:{organizationId:c.organizationId}}}}))throw new WonFlowApiError(400,"invalid-service-doctor","Doctor does not belong to this organization.");
    if(input.handlerMembershipId&&!await database.tenantMembership.findFirst({where:{id:input.handlerMembershipId,tenantId:c.tenantId,organizationId:c.organizationId,archivedAt:null}}))throw new WonFlowApiError(400,"invalid-service-handler","Select a staff member who works in this hospital.");
    const billingOwner=input.billingOwner??"HOSPITAL";
    if(billingOwner==="DEPARTMENT")throw new WonFlowApiError(400,"unsupported-billing-owner","A service price is controlled by hospital administration or by the assigned doctor.");
    if(billingOwner==="DOCTOR"&&!input.doctorId)throw new WonFlowApiError(400,"billing-owner-needs-doctor","Only a doctor-linked service can be priced by a doctor.");
    if(input.doctorId&&organization.doctorFeeAuthority==="DOCTOR")throw new WonFlowApiError(403,"doctor-controls-service","Doctor-managed access is active. Doctors must create their consultation services and fees from the doctor portal.");
    if(input.category==="CONSULTATION"&&organization.doctorFeeAuthority==="DOCTOR")throw new WonFlowApiError(403,"doctor-controls-consultation","Doctor-managed access is active. Hospital administrators cannot create consultation services or fees.");
    for(let attempt=0;attempt<5;attempt+=1){
      const code=requestedCode??await this.allocateServiceCode(c.tenantId,input.category);
      try{
        return await this.persistService(c,{...input,billingOwner},code);
      }catch(caught){
        if(!isUniqueConstraintError(caught))throw caught;
        if(requestedCode!==null)throw new WonFlowApiError(409,"service-code-in-use",`Service code ${requestedCode} is already used by another service.`);
      }
    }
    throw new WonFlowApiError(409,"service-code-unavailable","A unique service code could not be generated. Try again.");
  }
  private async persistService(c:WonFlowTenantRequestContext,input:{branchId?:string;handlerWorkspace?:WorkspaceCode;handlerMembershipId?:string;doctorId?:string;name:string;category:string;description?:string;durationMinutes:number;priceMinorUnits?:number;currencyCode?:string;publiclyBookable?:boolean;billingOwner:ServiceBillingOwner;consultationModes?:("IN_PERSON"|"ONLINE")[]},code:string){
    return database.$transaction(async tx=>{const currencyCode=input.currencyCode??c.currencyCode;const entity=await tx.serviceDefinition.create({data:{tenantId:c.tenantId,branchId:input.branchId??null,handlerMembershipId:input.handlerMembershipId??null,handlerWorkspace:input.handlerMembershipId?null:(input.handlerWorkspace??null),doctorId:input.doctorId??null,billingOwner:input.billingOwner,code,name:input.name.trim(),category:input.category,description:input.description?.trim()||null,durationMinutes:input.durationMinutes,priceMinorUnits:input.priceMinorUnits??null,currencyCode,publiclyBookable:input.publiclyBookable??false,consultationModes:input.category==="CONSULTATION"?(input.consultationModes?.length?input.consultationModes:["IN_PERSON"]):["IN_PERSON"]}});if(input.priceMinorUnits!==undefined)await tx.serviceFeeHistory.create({data:{tenantId:c.tenantId,serviceId:entity.id,priceMinorUnits:input.priceMinorUnits,currencyCode,changedByMembershipId:c.membershipId!}});await audit(tx,c,"organization.service.created","service",entity.id);return entity;});
  }
  async updateService(rc:WonFlowRequestContext,id:string,input:{name?:string;description?:string;handlerWorkspace?:WorkspaceCode|null;handlerMembershipId?:string|null;durationMinutes?:number;priceMinorUnits?:number|null;publiclyBookable?:boolean;isActive?:boolean;billingOwner?:ServiceBillingOwner;consultationModes?:("IN_PERSON"|"ONLINE")[]}){
    const c=this.context(rc);requirePermission(c,"organization.services.manage");
    if(input.name!==undefined&&!input.name.trim())throw new WonFlowApiError(400,"invalid-service-name","Enter a service name.");
    if(input.durationMinutes!==undefined&&(!Number.isInteger(input.durationMinutes)||input.durationMinutes<5||input.durationMinutes>480))throw new WonFlowApiError(400,"invalid-service-duration","Duration must be between 5 and 480 minutes.");
    if(input.priceMinorUnits!==undefined&&input.priceMinorUnits!==null&&(!Number.isInteger(input.priceMinorUnits)||input.priceMinorUnits<0))throw new WonFlowApiError(400,"invalid-service-price","Enter a valid service price.");
    if(input.consultationModes!==undefined&&input.consultationModes.length===0)throw new WonFlowApiError(400,"invalid-service-modes","Select at least one consultation mode.");
    const service=await database.serviceDefinition.findFirst({where:{id,tenantId:c.tenantId},include:{doctor:true}});
    if(!service)throw new WonFlowApiError(404,"service-not-found","The service could not be found.");
    if(input.handlerMembershipId&&!await database.tenantMembership.findFirst({where:{id:input.handlerMembershipId,tenantId:c.tenantId,organizationId:c.organizationId,archivedAt:null}}))throw new WonFlowApiError(400,"invalid-service-handler","Select a staff member who works in this hospital.");
    const organization=await database.organization.findFirst({where:{id:c.organizationId,tenantId:c.tenantId},select:{doctorFeeAuthority:true}});
    if(service.doctorId&&input.priceMinorUnits!==undefined&&organization?.doctorFeeAuthority==="DOCTOR")throw new WonFlowApiError(403,"doctor-controls-fee","This hospital allows doctors to set their own consultation fees.");
    const defaultBillingOwner = (input.priceMinorUnits!==undefined&&organization?.doctorFeeAuthority!=="DOCTOR")?"HOSPITAL":service.billingOwner;
    const billingOwner=input.billingOwner??defaultBillingOwner;
    if(billingOwner==="DEPARTMENT")throw new WonFlowApiError(400,"unsupported-billing-owner","A service price is controlled by hospital administration or by the assigned doctor.");
    if(billingOwner==="DOCTOR"&&!service.doctorId)throw new WonFlowApiError(400,"billing-owner-needs-doctor","Only a doctor-linked service can be priced by a doctor.");
    if(input.priceMinorUnits!==undefined&&billingOwner==="DOCTOR")throw new WonFlowApiError(403,"doctor-controls-fee","This service is priced by its assigned doctor.");
    return database.$transaction(async tx=>{const entity=await tx.serviceDefinition.update({where:{id,tenantId:c.tenantId},data:{...input,name:input.name!==undefined?input.name.trim():undefined,billingOwner,handlerWorkspace:input.handlerMembershipId?null:input.handlerWorkspace}});if(input.priceMinorUnits!==undefined&&input.priceMinorUnits!==null&&input.priceMinorUnits!==service.priceMinorUnits)await tx.serviceFeeHistory.create({data:{tenantId:c.tenantId,serviceId:entity.id,priceMinorUnits:input.priceMinorUnits,currencyCode:entity.currencyCode,changedByMembershipId:c.membershipId!}});await audit(tx,c,"organization.service.updated","service",entity.id);return entity;});
  }
  async deleteService(rc:WonFlowRequestContext,id:string){const c=this.context(rc);requirePermission(c,"organization.services.manage");const service=await database.serviceDefinition.findFirst({where:{id,tenantId:c.tenantId,isActive:true}});if(!service)throw new WonFlowApiError(404,"service-not-found","The service could not be found.");return database.$transaction(async tx=>{const entity=await tx.serviceDefinition.update({where:{id,tenantId:c.tenantId},data:{isActive:false,publiclyBookable:false}});await audit(tx,c,"organization.service.deleted","service",entity.id,"WARNING");return entity;});}
  async listSchedules(rc:WonFlowRequestContext){const c=this.context(rc);requirePermission(c,"organization.schedules.read");return database.availabilityRule.findMany({where:{tenantId:c.tenantId},include:{doctor:true,branch:true,service:true},orderBy:[{weekday:"asc"},{startsMinute:"asc"}]});}
  /**
   * Publishes (or withdraws) a doctor from the patient portal. Rostered hours
   * alone are never enough: the portal also requires this flag, and it defaults
   * to off so a newly created doctor is never exposed to patients by accident.
   * Without an administrator-facing switch the only way to turn it on was the
   * doctor's own profile screen, which left admin-configured clinics invisible
   * to patients with nothing on any screen explaining why.
   */
  async setDoctorPatientBooking(rc:WonFlowRequestContext,doctorId:string,publiclyBookable:boolean){
    const c=this.context(rc);requirePermission(c,"organization.schedules.manage");
    if(typeof publiclyBookable!=="boolean")throw new WonFlowApiError(400,"invalid-booking-flag","Specify whether patients may book this doctor online.");
    const doctor=await database.doctorProfile.findFirst({where:{id:doctorId,tenantId:c.tenantId,staffProfile:{membership:{organizationId:c.organizationId,archivedAt:null}}}});
    if(!doctor)throw new WonFlowApiError(404,"doctor-not-found","The doctor could not be found.");
    return database.$transaction(async tx=>{
      const entity=await tx.doctorProfile.update({where:{id:doctor.id},data:{publiclyBookable}});
      await audit(tx,c,publiclyBookable?"organization.doctor.patient-booking.enabled":"organization.doctor.patient-booking.disabled","doctor-profile",entity.id);
      return entity;
    });
  }

  async getDoctor(rc:WonFlowRequestContext,doctorId:string){
    const c=this.context(rc);
    requirePermission(c,"organization.users.read");
    const doctor=await database.doctorProfile.findFirst({
      where:{id:doctorId,tenantId:c.tenantId,staffProfile:{membership:{organizationId:c.organizationId,archivedAt:null}}},
      include:{
        staffProfile:{
          include:{
            membership:{
              include:{
                identity:{select:{email:true,phone:true,status:true}}
              }
            },
            branch:true
          }
        },
        department:{select:{id:true,name:true,code:true}},
        services:{
          where:{category:"CONSULTATION",isActive:true},
          select:{id:true,name:true,priceMinorUnits:true,durationMinutes:true,publiclyBookable:true},
          orderBy:{createdAt:"asc"},
          take:1
        }
      }
    });
    if(!doctor)throw new WonFlowApiError(404,"doctor-not-found","The doctor could not be found.");
    return doctor;
  }

  async updateDoctor(
    rc: WonFlowRequestContext,
    doctorId: string,
    input: {
      displayName?: string;
      title?: string | null;
      email?: string;
      contactPhone?: string | null;
      primaryBranchId?: string | null;
      departmentId?: string | null;
      specialty?: string | null;
      registrationNumber?: string | null;
      durationMinutes?: number;
      publiclyBookable?: boolean;
      consultationFee?: number | null;
      qualifications?: string | null;
      biography?: string | null;
      profileImageData?: string | null;
      workspaceCodes?: WorkspaceCode[];
    }
  ) {
    const c = this.context(rc);
    requirePermission(c, "organization.users.manage");

    const doctor = await database.doctorProfile.findFirst({
      where: {
        id: doctorId,
        tenantId: c.tenantId,
        staffProfile: { membership: { organizationId: c.organizationId, archivedAt: null } },
      },
      include: {
        staffProfile: {
          include: {
            membership: {
              include: {
                identity: true,
              },
            },
            branch: true,
          },
        },
        department: true,
        services: {
          where: { category: { in: ["CONSULTATION", "Consultation", "consultation"] }, isActive: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!doctor) {
      throw new WonFlowApiError(404, "doctor-not-found", "The doctor could not be found.");
    }

    if (input.displayName !== undefined && !input.displayName.trim()) {
      throw new WonFlowApiError(400, "invalid-doctor-name", "Doctor full name is required.");
    }

    if (input.durationMinutes !== undefined && (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 5 || input.durationMinutes > 480)) {
      throw new WonFlowApiError(400, "invalid-doctor-duration", "Consultation duration must be between 5 and 480 minutes.");
    }

    if (input.consultationFee !== undefined && input.consultationFee !== null && (input.consultationFee < 0 || Number.isNaN(input.consultationFee))) {
      throw new WonFlowApiError(400, "invalid-doctor-fee", "Enter a valid consultation fee.");
    }

    if (input.email) {
      const normalizedEmail = input.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw new WonFlowApiError(400, "invalid-email-address", "Enter a valid email address.");
      }
      const existing = await database.identity.findFirst({
        where: {
          normalizedEmail,
          id: { not: doctor.staffProfile.membership.identity.id },
        },
      });
      if (existing) {
        throw new WonFlowApiError(409, "email-in-use", `The email address ${input.email.trim()} is already in use by another account.`);
      }
    }

    let selectedDepartment: { id: string; name: string } | null = null;
    if (input.departmentId) {
      selectedDepartment = await database.department.findFirst({
        where: { id: input.departmentId, tenantId: c.tenantId, organizationId: c.organizationId, archivedAt: null },
      });
      if (!selectedDepartment) {
        throw new WonFlowApiError(400, "invalid-department", "Select a department configured for this hospital.");
      }
    }

    if (input.primaryBranchId) {
      const branch = await database.branch.findFirst({
        where: { id: input.primaryBranchId, tenantId: c.tenantId, organizationId: c.organizationId, archivedAt: null },
      });
      if (!branch) {
        throw new WonFlowApiError(400, "invalid-branch", "Branch does not belong to this hospital.");
      }
    }

    if (input.registrationNumber !== undefined && input.registrationNumber?.trim()) {
      const existingReg = await database.doctorProfile.findFirst({
        where: {
          tenantId: c.tenantId,
          registrationNumber: input.registrationNumber.trim(),
          id: { not: doctor.id },
        },
      });
      if (existingReg) {
        throw new WonFlowApiError(409, "registration-in-use", `Registration number ${input.registrationNumber.trim()} is already used by another doctor.`);
      }
    }

    if (input.workspaceCodes) {
      if (input.workspaceCodes.length === 0) {
        throw new WonFlowApiError(400, "workspace-required", "A user must have at least one workspace assigned.");
      }
      const enabledModules = await readEnabledModules(c.tenantId);
      const forbidden = input.workspaceCodes.filter((code) => !isWorkspaceEntitled(code, enabledModules));
      if (forbidden.length > 0) {
        throw new WonFlowApiError(403, "workspace-not-entitled", `This hospital is not licensed for the ${forbidden.join(", ").toLowerCase()} workspace.`);
      }
    }

    const priceMinorUnits = input.consultationFee !== undefined && input.consultationFee !== null ? Math.round(input.consultationFee * 100) : undefined;
    const finalDepartmentId = input.departmentId !== undefined ? (input.departmentId || null) : doctor.departmentId;
    const finalSpecialty = input.specialty !== undefined
      ? input.specialty?.trim() || null
      : selectedDepartment
      ? selectedDepartment.name
      : doctor.specialty;

    return database.$transaction(async (tx) => {
      // 1. Update Identity
      const identityData: { email?: string; normalizedEmail?: string; phone?: string | null } = {};
      if (input.email) {
        identityData.email = input.email.trim();
        identityData.normalizedEmail = input.email.trim().toLowerCase();
      }
      if (input.contactPhone !== undefined) {
        identityData.phone = input.contactPhone?.trim() || null;
      }
      if (Object.keys(identityData).length > 0) {
        await tx.identity.update({
          where: { id: doctor.staffProfile.membership.identity.id },
          data: identityData,
        });
      }

      // 2. Update TenantMembership
      const membershipData: { displayName?: string; primaryBranchId?: string | null; workspaceCodes?: WorkspaceCode[] } = {};
      if (input.displayName !== undefined) {
        membershipData.displayName = input.displayName.trim();
      }
      if (input.primaryBranchId !== undefined) {
        membershipData.primaryBranchId = input.primaryBranchId || null;
      }
      if (input.workspaceCodes !== undefined) {
        membershipData.workspaceCodes = input.workspaceCodes;
      }
      if (Object.keys(membershipData).length > 0) {
        await tx.tenantMembership.update({
          where: { id: doctor.staffProfile.membership.id },
          data: membershipData,
        });
      }

      // 3. Update Roles if workspaceCodes provided
      if (input.workspaceCodes) {
        await ensureWorkspaceRoles(tx, c.tenantId, input.workspaceCodes);
        const roles = await tx.role.findMany({
          where: { tenantId: c.tenantId, code: { in: input.workspaceCodes }, isActive: true, archivedAt: null },
          select: { id: true },
        });
        await tx.membershipRole.deleteMany({
          where: { tenantId: c.tenantId, membershipId: doctor.staffProfile.membership.id },
        });
        if (roles.length > 0) {
          await tx.membershipRole.createMany({
            data: roles.map((r) => ({
              tenantId: c.tenantId,
              membershipId: doctor.staffProfile.membership.id,
              roleId: r.id,
              branchId: input.primaryBranchId !== undefined ? (input.primaryBranchId || null) : doctor.staffProfile.membership.primaryBranchId,
            })),
          });
        }
      } else if (input.primaryBranchId !== undefined) {
        await tx.membershipRole.updateMany({
          where: { tenantId: c.tenantId, membershipId: doctor.staffProfile.membership.id },
          data: { branchId: input.primaryBranchId || null },
        });
      }

      // 4. Update StaffProfile
      const staffData: { title?: string | null; branchId?: string | null } = {};
      if (input.title !== undefined) {
        staffData.title = input.title?.trim() || null;
      }
      if (input.primaryBranchId !== undefined) {
        staffData.branchId = input.primaryBranchId || null;
      }
      if (Object.keys(staffData).length > 0) {
        await tx.staffProfile.update({
          where: { id: doctor.staffProfile.id },
          data: staffData,
        });
      }

      // 5. Update DoctorProfile
      const updatedDoctor = await tx.doctorProfile.update({
        where: { id: doctor.id },
        data: {
          departmentId: finalDepartmentId,
          specialty: finalSpecialty,
          registrationNumber: input.registrationNumber !== undefined ? (input.registrationNumber?.trim() || null) : undefined,
          durationMinutes: input.durationMinutes !== undefined ? input.durationMinutes : undefined,
          publiclyBookable: input.publiclyBookable !== undefined ? input.publiclyBookable : undefined,
          qualifications: input.qualifications !== undefined ? (input.qualifications?.trim() || null) : undefined,
          biography: input.biography !== undefined ? (input.biography?.trim() || null) : undefined,
          contactPhone: input.contactPhone !== undefined ? (input.contactPhone?.trim() || null) : undefined,
          profileImageData: input.profileImageData !== undefined ? (input.profileImageData?.trim() || null) : undefined,
        },
        include: {
          staffProfile: {
            include: {
              membership: {
                include: {
                  identity: { select: { email: true, phone: true, status: true } },
                },
              },
              branch: true,
            },
          },
          department: { select: { id: true, name: true, code: true } },
          services: {
            where: { category: "CONSULTATION", isActive: true },
            select: { id: true, name: true, priceMinorUnits: true, durationMinutes: true, publiclyBookable: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      // 6. Synchronize Default Consultation Service
      const consultationService = doctor.services[0];
      const serviceName = `Consultation - ${input.displayName?.trim() ?? doctor.staffProfile.membership.displayName}`;
      const serviceDuration = input.durationMinutes !== undefined ? input.durationMinutes : doctor.durationMinutes;
      const serviceBookable = input.publiclyBookable !== undefined ? input.publiclyBookable : doctor.publiclyBookable;
      const serviceBranchId = input.primaryBranchId !== undefined ? (input.primaryBranchId || null) : doctor.staffProfile.branchId;

      if (consultationService) {
        const updateServiceData: {
          name?: string;
          durationMinutes?: number;
          publiclyBookable?: boolean;
          branchId?: string | null;
          priceMinorUnits?: number | null;
        } = {
          name: serviceName,
          durationMinutes: serviceDuration,
          publiclyBookable: serviceBookable,
        };
        if (input.primaryBranchId !== undefined) {
          updateServiceData.branchId = input.primaryBranchId || null;
        }
        if (priceMinorUnits !== undefined) {
          updateServiceData.priceMinorUnits = priceMinorUnits;
        }

        await tx.serviceDefinition.update({
          where: { id: consultationService.id },
          data: updateServiceData,
        });

        if (priceMinorUnits !== undefined && priceMinorUnits !== consultationService.priceMinorUnits) {
          await tx.serviceFeeHistory.create({
            data: {
              tenantId: c.tenantId,
              serviceId: consultationService.id,
              priceMinorUnits,
              currencyCode: consultationService.currencyCode,
              changedByMembershipId: (c.membershipId ?? c.userId)!,
            },
          });
        }
      } else if (priceMinorUnits !== undefined) {
        const newService = await tx.serviceDefinition.create({
          data: {
            tenantId: c.tenantId,
            branchId: serviceBranchId ?? null,
            doctorId: doctor.id,
            billingOwner: "HOSPITAL",
            code: `CONSULT-${doctor.id.slice(0, 8).toUpperCase()}`,
            name: serviceName,
            category: "CONSULTATION",
            durationMinutes: serviceDuration,
            priceMinorUnits,
            currencyCode: c.currencyCode ?? "PKR",
            publiclyBookable: serviceBookable,
            consultationModes: ["IN_PERSON", "ONLINE"],
            isActive: true,
          },
        });
        await tx.serviceFeeHistory.create({
          data: {
            tenantId: c.tenantId,
            serviceId: newService.id,
            priceMinorUnits,
            currencyCode: c.currencyCode ?? "PKR",
            changedByMembershipId: (c.membershipId ?? c.userId)!,
          },
        });
      }

      await audit(tx, c, "organization.doctor.updated", "doctor-profile", doctor.id, "INFORMATION");

      return updatedDoctor;
    });
  }
  async createSchedule(rc: WonFlowRequestContext, input: { doctorId: string; branchId: string; serviceId?: string; weekday?: number; weekdays?: number[]; startsMinute: number; endsMinute: number; capacity?: number; validFrom: string; validUntil?: string }) {
    const c = this.context(rc);
    requirePermission(c, "organization.schedules.manage");
    const weekdays = input.weekdays && Array.isArray(input.weekdays) && input.weekdays.length > 0
      ? Array.from(new Set(input.weekdays))
      : input.weekday !== undefined
        ? [input.weekday]
        : [];
    if (weekdays.length === 0 || weekdays.some((wd) => !Number.isInteger(wd) || wd < 0 || wd > 6))
      throw new WonFlowApiError(400, "invalid-schedule-weekday", "Select at least one valid weekday.");
    let endsMinute = input.endsMinute;
    if (endsMinute === 0 && input.startsMinute > 0) {
      endsMinute = 1440;
    }
    if (!Number.isInteger(input.startsMinute) || !Number.isInteger(endsMinute) || input.startsMinute < 0 || endsMinute > 1440)
      throw new WonFlowApiError(400, "invalid-schedule-time", "Enter valid start and end times.");
    if (endsMinute === input.startsMinute)
      throw new WonFlowApiError(400, "invalid-schedule-time", "End time cannot be the same as start time.");
    const isOvernight = endsMinute < input.startsMinute;
    if (input.capacity !== undefined && (!Number.isInteger(input.capacity) || input.capacity < 1))
      throw new WonFlowApiError(400, "invalid-schedule-capacity", "Capacity must be at least one.");
    const validFrom = new Date(input.validFrom);
    const validUntil = input.validUntil ? new Date(input.validUntil) : null;
    if (Number.isNaN(validFrom.getTime()) || (validUntil && Number.isNaN(validUntil.getTime())))
      throw new WonFlowApiError(400, "invalid-schedule-date", "Select a valid schedule date.");
    const [branch, doctor, selectedService] = await Promise.all([
      database.branch.findFirst({ where: { id: input.branchId, tenantId: c.tenantId, organizationId: c.organizationId } }),
      database.doctorProfile.findFirst({ where: { id: input.doctorId, tenantId: c.tenantId, staffProfile: { membership: { organizationId: c.organizationId } } } }),
      input.serviceId ? database.serviceDefinition.findFirst({ where: { id: input.serviceId, tenantId: c.tenantId } }) : Promise.resolve(null),
    ]);
    if (!branch || !doctor) throw new WonFlowApiError(400, "invalid-schedule-assignment", "Doctor or branch is outside this hospital.");
    if (input.serviceId && !selectedService) throw new WonFlowApiError(400, "invalid-schedule-service", "Service is outside this hospital.");
    return database.$transaction(async (tx) => {
      const createdList = [];
      for (const wd of weekdays) {
        if (isOvernight) {
          const entity = await tx.availabilityRule.create({
            data: {
              tenantId: c.tenantId,
              doctorId: input.doctorId,
              branchId: input.branchId,
              serviceId: input.serviceId ?? null,
              weekday: wd,
              startsMinute: input.startsMinute,
              endsMinute: 1440,
              capacity: input.capacity ?? 1,
              validFrom,
              validUntil,
            },
          });
          await tx.availabilityRule.create({
            data: {
              tenantId: c.tenantId,
              doctorId: input.doctorId,
              branchId: input.branchId,
              serviceId: input.serviceId ?? null,
              weekday: (wd + 1) % 7,
              startsMinute: 0,
              endsMinute,
              capacity: input.capacity ?? 1,
              validFrom,
              validUntil,
            },
          });
          await audit(tx, c, "organization.schedule.created", "availability-rule", entity.id);
          createdList.push(entity);
        } else {
          const entity = await tx.availabilityRule.create({
            data: {
              tenantId: c.tenantId,
              doctorId: input.doctorId,
              branchId: input.branchId,
              weekday: wd,
              startsMinute: input.startsMinute,
              endsMinute,
              serviceId: input.serviceId ?? null,
              capacity: input.capacity ?? 1,
              validFrom,
              validUntil,
            },
          });
          await audit(tx, c, "organization.schedule.created", "availability-rule", entity.id);
          createdList.push(entity);
        }
      }
      return createdList[0];
    });
  }
  async updateSchedule(rc: WonFlowRequestContext, id: string, input: { doctorId?: string; branchId?: string; serviceId?: string | null; weekday?: number; startsMinute?: number; endsMinute?: number; capacity?: number; validFrom?: string; validUntil?: string | null; isActive?: boolean }) {
    const c = this.context(rc);
    requirePermission(c, "organization.schedules.manage");
    const schedule = await database.availabilityRule.findFirst({ where: { id, tenantId: c.tenantId } });
    if (!schedule) throw new WonFlowApiError(404, "schedule-not-found", "The rostered hours could not be found.");
    const weekday = input.weekday ?? schedule.weekday;
    const startsMinute = input.startsMinute ?? schedule.startsMinute;
    let endsMinute = input.endsMinute ?? schedule.endsMinute;
    if (endsMinute === 0 && startsMinute > 0) {
      endsMinute = 1440;
    }
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6)
      throw new WonFlowApiError(400, "invalid-schedule-weekday", "Select a valid weekday.");
    if (!Number.isInteger(startsMinute) || !Number.isInteger(endsMinute) || startsMinute < 0 || endsMinute > 1440)
      throw new WonFlowApiError(400, "invalid-schedule-time", "Enter valid start and end times.");
    if (endsMinute === startsMinute)
      throw new WonFlowApiError(400, "invalid-schedule-time", "End time cannot be the same as start time.");
    const isOvernight = endsMinute < startsMinute;
    if (input.capacity !== undefined && (!Number.isInteger(input.capacity) || input.capacity < 1))
      throw new WonFlowApiError(400, "invalid-schedule-capacity", "Capacity must be at least one.");
    const validFrom = input.validFrom === undefined ? undefined : new Date(input.validFrom);
    const validUntil = input.validUntil === undefined ? undefined : input.validUntil === null ? null : new Date(input.validUntil);
    if ((validFrom && Number.isNaN(validFrom.getTime())) || (validUntil && Number.isNaN(validUntil.getTime())))
      throw new WonFlowApiError(400, "invalid-schedule-date", "Select a valid schedule date.");
    if (input.branchId && !await database.branch.findFirst({ where: { id: input.branchId, tenantId: c.tenantId, organizationId: c.organizationId } }))
      throw new WonFlowApiError(400, "invalid-schedule-assignment", "Doctor or branch is outside this hospital.");
    if (input.doctorId && !await database.doctorProfile.findFirst({ where: { id: input.doctorId, tenantId: c.tenantId, staffProfile: { membership: { organizationId: c.organizationId } } } }))
      throw new WonFlowApiError(400, "invalid-schedule-assignment", "Doctor or branch is outside this hospital.");
    if (input.serviceId && !await database.serviceDefinition.findFirst({ where: { id: input.serviceId, tenantId: c.tenantId } }))
      throw new WonFlowApiError(400, "invalid-schedule-service", "Service is outside this hospital.");
    return database.$transaction(async (tx) => {
      const entity = await tx.availabilityRule.update({
        where: { id: schedule.id, tenantId: c.tenantId },
        data: {
          ...input,
          weekday,
          startsMinute,
          endsMinute: isOvernight ? 1440 : endsMinute,
          serviceId: input.serviceId === undefined ? undefined : input.serviceId || null,
          validFrom,
          validUntil,
        },
      });
      if (isOvernight) {
        await tx.availabilityRule.create({
          data: {
            tenantId: c.tenantId,
            doctorId: input.doctorId ?? schedule.doctorId,
            branchId: input.branchId ?? schedule.branchId,
            serviceId: (input.serviceId === undefined ? schedule.serviceId : input.serviceId) || null,
            weekday: (weekday + 1) % 7,
            startsMinute: 0,
            endsMinute,
            capacity: input.capacity ?? schedule.capacity,
            validFrom: validFrom ?? schedule.validFrom,
            validUntil: validUntil !== undefined ? validUntil : schedule.validUntil,
          },
        });
      }
      await audit(tx, c, "organization.schedule.updated", "availability-rule", entity.id);
      return entity;
    });
  }
  async deleteSchedule(rc:WonFlowRequestContext,id:string){
    const c=this.context(rc);requirePermission(c,"organization.schedules.manage");
    const schedule=await database.availabilityRule.findFirst({where:{id,tenantId:c.tenantId}});
    if(!schedule)throw new WonFlowApiError(404,"schedule-not-found","The rostered hours could not be found.");
    return database.$transaction(async tx=>{const entity=await tx.availabilityRule.delete({where:{id:schedule.id,tenantId:c.tenantId}});await audit(tx,c,"organization.schedule.deleted","availability-rule",entity.id,"WARNING");return entity;});
  }
  // Policies reuse the hospital-profile permissions: they are hospital-wide
  // configuration, published by the same administrators who own the profile.
  async listPolicies(rc:WonFlowRequestContext){
    const c=this.context(rc);requirePermission(c,"organization.profile.read");
    return database.policyDocument.findMany({
      where:{tenantId:c.tenantId,organizationId:c.organizationId},
      include:{versions:{orderBy:{version:"desc"},take:5,select:{id:true,version:true,publishedAt:true,title:true}}},
      orderBy:[{status:"asc"},{updatedAt:"desc"}],
    });
  }
  async createPolicy(rc:WonFlowRequestContext,input:{code?:string;title:string;category:string;summary?:string;body:string;effectiveFrom?:string}){
    const c=this.context(rc);requirePermission(c,"organization.profile.manage");
    const title=input.title?.trim(),body=input.body?.trim(),category=input.category?.trim();
    if(!title||!body||!category)throw new WonFlowApiError(400,"policy-details-required","Enter a policy title, category and content.");
    const effectiveFrom=input.effectiveFrom?new Date(input.effectiveFrom):null;
    if(effectiveFrom&&Number.isNaN(effectiveFrom.getTime()))throw new WonFlowApiError(400,"invalid-policy-date","Select a valid effective date.");
    const code=input.code?.trim()?normalizeServiceCode(input.code):await this.allocatePolicyCode(c.tenantId,category);
    if(await database.policyDocument.findFirst({where:{tenantId:c.tenantId,code}}))throw new WonFlowApiError(409,"policy-code-in-use",`Policy code ${code} is already used by another document.`);
    return database.$transaction(async tx=>{const entity=await tx.policyDocument.create({data:{tenantId:c.tenantId,organizationId:c.organizationId,code,title,category,summary:input.summary?.trim()||null,body,effectiveFrom}});await audit(tx,c,"organization.policy.created","policy",entity.id);return entity;});
  }
  private async allocatePolicyCode(tenantId:string,category:string){
    const prefix=category.trim().toUpperCase().replaceAll(/[^A-Z0-9]+/g,"").slice(0,6)||"POLICY";
    const existing=await database.policyDocument.findMany({where:{tenantId,code:{startsWith:`${prefix}-`}},select:{code:true}});
    return nextSequentialCode(prefix,existing.map(policy=>policy.code));
  }
  async updatePolicy(rc:WonFlowRequestContext,id:string,input:{title?:string;category?:string;summary?:string|null;body?:string;effectiveFrom?:string|null}){
    const c=this.context(rc);requirePermission(c,"organization.profile.manage");
    const policy=await database.policyDocument.findFirst({where:{id,tenantId:c.tenantId,organizationId:c.organizationId}});
    if(!policy)throw new WonFlowApiError(404,"policy-not-found","The policy could not be found.");
    if(policy.status==="ARCHIVED")throw new WonFlowApiError(409,"policy-archived","Restore this policy before editing it.");
    if(input.title!==undefined&&!input.title.trim())throw new WonFlowApiError(400,"invalid-policy-title","Enter a policy title.");
    if(input.body!==undefined&&!input.body.trim())throw new WonFlowApiError(400,"invalid-policy-body","Enter the policy content.");
    const effectiveFrom=input.effectiveFrom===undefined?undefined:input.effectiveFrom===null?null:new Date(input.effectiveFrom);
    if(effectiveFrom&&Number.isNaN(effectiveFrom.getTime()))throw new WonFlowApiError(400,"invalid-policy-date","Select a valid effective date.");
    return database.$transaction(async tx=>{
      const entity=await tx.policyDocument.update({where:{id:policy.id,tenantId:c.tenantId},data:{title:input.title?.trim(),category:input.category?.trim(),summary:input.summary===undefined?undefined:input.summary?.trim()||null,body:input.body?.trim(),effectiveFrom,
        // Editing a published policy returns it to draft; the published wording
        // stays readable in its version history until the edit is published.
        status:policy.status==="PUBLISHED"?"DRAFT":policy.status}});
      await audit(tx,c,"organization.policy.updated","policy",entity.id);return entity;});
  }
  async publishPolicy(rc:WonFlowRequestContext,id:string){
    const c=this.context(rc);requirePermission(c,"organization.profile.manage");
    const policy=await database.policyDocument.findFirst({where:{id,tenantId:c.tenantId,organizationId:c.organizationId}});
    if(!policy)throw new WonFlowApiError(404,"policy-not-found","The policy could not be found.");
    if(policy.status==="ARCHIVED")throw new WonFlowApiError(409,"policy-archived","Restore this policy before publishing it.");
    const latest=await database.policyDocumentVersion.findFirst({where:{policyId:policy.id},orderBy:{version:"desc"},select:{version:true}});
    const version=(latest?.version??0)+1;
    return database.$transaction(async tx=>{
      await tx.policyDocumentVersion.create({data:{tenantId:c.tenantId,policyId:policy.id,version,title:policy.title,body:policy.body,effectiveFrom:policy.effectiveFrom,publishedById:c.membershipId}});
      const entity=await tx.policyDocument.update({where:{id:policy.id,tenantId:c.tenantId},data:{status:"PUBLISHED",version,publishedAt:new Date()}});
      await audit(tx,c,"organization.policy.published","policy",entity.id,"WARNING");
      return entity;
    });
  }
  async setPolicyArchived(rc:WonFlowRequestContext,id:string,archived:boolean){
    const c=this.context(rc);requirePermission(c,"organization.profile.manage");
    const policy=await database.policyDocument.findFirst({where:{id,tenantId:c.tenantId,organizationId:c.organizationId}});
    if(!policy)throw new WonFlowApiError(404,"policy-not-found","The policy could not be found.");
    return database.$transaction(async tx=>{const entity=await tx.policyDocument.update({where:{id:policy.id,tenantId:c.tenantId},data:archived?{status:"ARCHIVED",archivedAt:new Date()}:{status:"DRAFT",archivedAt:null}});await audit(tx,c,archived?"organization.policy.archived":"organization.policy.restored","policy",entity.id,"WARNING");return entity;});
  }
  async listAudit(rc:WonFlowRequestContext){const c=this.context(rc);requirePermission(c,"organization.audit.read");return database.auditEvent.findMany({where:{tenantId:c.tenantId},orderBy:{createdAt:"desc"},take:200});}
  /** Returns all pending fee requests for the organization's doctors. */
  async listFeeRequests(rc:WonFlowRequestContext){
    const c=this.context(rc);requirePermission(c,"organization.services.manage");
    return database.doctorFeeRequest.findMany({
      where:{tenantId:c.tenantId},
      include:{
        doctor:{include:{staffProfile:{include:{membership:{select:{id:true,displayName:true}}}}}},
        service:{select:{id:true,name:true,code:true,priceMinorUnits:true,currencyCode:true}},
        proposedBranch:{select:{id:true,name:true}},
        requestedBy:{select:{id:true,displayName:true}},
        reviewedBy:{select:{id:true,displayName:true}},
      },
      orderBy:[{status:"asc"},{createdAt:"desc"}],
      take:100,
    });
  }
  /** Approve or decline a doctor fee request. When approved, creates the service or updates the fee. */
  async reviewFeeRequest(rc:WonFlowRequestContext,requestId:string,input:{action:"APPROVE"|"DECLINE";rejectionReason?:string}){
    const c=this.context(rc);requirePermission(c,"organization.services.manage");
    const feeRequest=await database.doctorFeeRequest.findFirst({where:{id:requestId,tenantId:c.tenantId,status:"PENDING"}});
    if(!feeRequest)throw new WonFlowApiError(404,"fee-request-not-found","The fee request could not be found or has already been reviewed.");
    if(input.action==="DECLINE"){
      if(!input.rejectionReason?.trim())throw new WonFlowApiError(400,"rejection-reason-required","Enter a reason for declining this fee request.");
      return database.$transaction(async tx=>{
        const updated=await tx.doctorFeeRequest.update({where:{id:feeRequest.id},data:{status:"DECLINED",reviewedByMembershipId:c.membershipId,rejectionReason:input.rejectionReason!.trim(),reviewedAt:new Date()}});
        await audit(tx,c,"organization.fee-request.declined","doctor-fee-request",updated.id,"WARNING");
        return updated;
      });
    }
    // Approve
    return database.$transaction(async tx=>{
      if(feeRequest.requestType==="CREATE_SERVICE"){
        const doctor=await tx.doctorProfile.findFirst({where:{id:feeRequest.doctorId,tenantId:c.tenantId},include:{staffProfile:{include:{membership:true}}}});
        if(!doctor)throw new WonFlowApiError(404,"doctor-not-found","The doctor could not be found.");
        // Generate a unique service code
        const existingCodes=await tx.serviceDefinition.findMany({where:{tenantId:c.tenantId,code:{startsWith:"DR-"}},select:{code:true}});
        const codeBase=`DR-${doctor.id.slice(0,8)}-CONSULT`.toUpperCase();
        let code=codeBase;
        let attempt=1;
        while(existingCodes.some(s=>s.code===code)){code=`${codeBase}-${attempt}`;attempt++;}
        const service=await tx.serviceDefinition.create({data:{
          tenantId:c.tenantId,
          branchId:feeRequest.proposedBranchId,
          doctorId:doctor.id,
          code,
          name:feeRequest.proposedName??"Consultation",
          category:"CONSULTATION",
          description:feeRequest.proposedDescription,
          durationMinutes:feeRequest.proposedDurationMinutes??15,
          priceMinorUnits:feeRequest.proposedPriceMinorUnits,
          currencyCode:feeRequest.proposedCurrencyCode,
          publiclyBookable:feeRequest.proposedPubliclyBookable,
          consultationModes:feeRequest.proposedConsultationModes.length?feeRequest.proposedConsultationModes:["IN_PERSON"],
          handlerMembershipId:doctor.staffProfile.membershipId,
          billingOwner:"DOCTOR",
        }});
        await tx.serviceFeeHistory.create({data:{tenantId:c.tenantId,serviceId:service.id,priceMinorUnits:feeRequest.proposedPriceMinorUnits,currencyCode:feeRequest.proposedCurrencyCode,changedByMembershipId:c.membershipId!}});
        await tx.doctorFeeRequest.update({where:{id:feeRequest.id},data:{status:"APPROVED",serviceId:service.id,reviewedByMembershipId:c.membershipId,reviewedAt:new Date()}});
        await audit(tx,c,"organization.fee-request.approved","doctor-fee-request",feeRequest.id);
        return{feeRequest:{...feeRequest,status:"APPROVED"},service};
      }
      // UPDATE_FEE
      if(!feeRequest.serviceId)throw new WonFlowApiError(400,"fee-request-missing-service","This fee request is not linked to an existing service.");
      const service=await tx.serviceDefinition.findFirst({where:{id:feeRequest.serviceId,tenantId:c.tenantId}});
      if(!service)throw new WonFlowApiError(404,"service-not-found","The service could not be found.");
      await tx.serviceDefinition.update({where:{id:service.id,tenantId:c.tenantId},data:{priceMinorUnits:feeRequest.proposedPriceMinorUnits}});
      await tx.serviceFeeHistory.create({data:{tenantId:c.tenantId,serviceId:service.id,priceMinorUnits:feeRequest.proposedPriceMinorUnits,currencyCode:feeRequest.proposedCurrencyCode,changedByMembershipId:c.membershipId!}});
      await tx.doctorFeeRequest.update({where:{id:feeRequest.id},data:{status:"APPROVED",reviewedByMembershipId:c.membershipId,reviewedAt:new Date()}});
      await audit(tx,c,"organization.fee-request.approved","doctor-fee-request",feeRequest.id);
      return{feeRequest:{...feeRequest,status:"APPROVED"},service};
    });
  }

  async getAdministratorProfile(rc: WonFlowRequestContext) {
    const c = this.context(rc);
    const membershipId = c.membershipId;
    if (!membershipId) {
      throw new WonFlowApiError(401, "membership-required", "You must be signed in with a hospital membership.");
    }
    const membership = await database.tenantMembership.findFirst({
      where: { id: membershipId, tenantId: c.tenantId },
      include: {
        identity: {
          select: {
            email: true,
            phone: true,
            status: true,
            createdAt: true,
            passwordChangedAt: true,
          },
        },
        staffProfile: {
          select: {
            title: true,
            employeeNumber: true,
          },
        },
      },
    });
    if (!membership) {
      throw new WonFlowApiError(404, "membership-not-found", "Administrator profile could not be found.");
    }
    return {
      membershipId: membership.id,
      identityId: membership.identityId,
      displayName: membership.displayName,
      email: membership.identity.email,
      phone: membership.identity.phone,
      title: membership.staffProfile?.title ?? "Hospital Administrator",
      hasPhoto: Boolean(membership.photoObjectKey),
      avatarUrl: membership.photoObjectKey ? "/api/v1/admin/profile/avatar" : null,
      status: membership.identity.status,
      createdAt: membership.identity.createdAt,
      passwordChangedAt: membership.identity.passwordChangedAt,
    };
  }

  async updateAdministratorProfile(
    rc: WonFlowRequestContext,
    input: { displayName?: string; phone?: string | null; title?: string | null },
  ) {
    const c = this.context(rc);
    const membershipId = c.membershipId;
    if (!membershipId) {
      throw new WonFlowApiError(401, "membership-required", "You must be signed in with a hospital membership.");
    }
    const membership = await database.tenantMembership.findFirst({
      where: { id: membershipId, tenantId: c.tenantId },
    });
    if (!membership) {
      throw new WonFlowApiError(404, "membership-not-found", "Administrator profile could not be found.");
    }

    const trimmedName = input.displayName !== undefined ? input.displayName.trim() : undefined;
    if (trimmedName !== undefined && !trimmedName) {
      throw new WonFlowApiError(400, "invalid-name", "Display name cannot be empty.");
    }

    const trimmedPhone = input.phone !== undefined ? (input.phone?.trim() || null) : undefined;
    const trimmedTitle = input.title !== undefined ? (input.title?.trim() || null) : undefined;

    return database.$transaction(async (tx) => {
      if (trimmedName !== undefined) {
        await tx.tenantMembership.update({
          where: { id: membership.id },
          data: { displayName: trimmedName },
        });
      }

      if (trimmedPhone !== undefined) {
        await tx.identity.update({
          where: { id: membership.identityId },
          data: {
            phone: trimmedPhone,
            normalizedPhone: trimmedPhone ? trimmedPhone.replace(/[\s()-]/g, "") : null,
          },
        });
      }

      if (trimmedTitle !== undefined) {
        const existingStaff = await tx.staffProfile.findUnique({
          where: { membershipId: membership.id },
        });
        if (existingStaff) {
          await tx.staffProfile.update({
            where: { id: existingStaff.id },
            data: { title: trimmedTitle },
          });
        } else {
          await tx.staffProfile.create({
            data: {
              tenantId: c.tenantId,
              membershipId: membership.id,
              branchId: membership.primaryBranchId,
              employeeNumber: `ADM-${membership.id.slice(0, 8).toUpperCase()}`,
              staffType: "ADMIN",
              title: trimmedTitle,
            },
          });
        }
      }

      await audit(tx, c, "organization.administrator.profile_updated", "tenant-membership", membership.id);
      return this.getAdministratorProfile(rc);
    });
  }

  async uploadAdministratorAvatar(rc: WonFlowRequestContext, file: File) {
    const c = this.context(rc);
    const membershipId = c.membershipId;
    if (!membershipId) {
      throw new WonFlowApiError(401, "membership-required", "You must be signed in with a hospital membership.");
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new WonFlowApiError(400, "invalid-image-type", "Only JPEG, PNG and WebP images are supported.");
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new WonFlowApiError(400, "file-too-large", "Photo must be 2 MB or smaller.");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const { objectKey } = await persistUploadedDocumentBytes({
      tenantId: c.tenantId,
      patientId: "avatars",
      bytes,
    });

    await database.$transaction(async (tx) => {
      await tx.tenantMembership.update({
        where: { id: membershipId },
        data: { photoObjectKey: objectKey },
      });
      await audit(tx, c, "organization.administrator.avatar_uploaded", "tenant-membership", membershipId);
    });

    return { ok: true, objectKey };
  }

  async removeAdministratorAvatar(rc: WonFlowRequestContext) {
    const c = this.context(rc);
    const membershipId = c.membershipId;
    if (!membershipId) {
      throw new WonFlowApiError(401, "membership-required", "You must be signed in with a hospital membership.");
    }

    await database.$transaction(async (tx) => {
      await tx.tenantMembership.update({
        where: { id: membershipId },
        data: { photoObjectKey: null },
      });
      await audit(tx, c, "organization.administrator.avatar_removed", "tenant-membership", membershipId);
    });

    return { ok: true };
  }

  async readAdministratorAvatarBytes(rc: WonFlowRequestContext): Promise<{ bytes: Buffer; contentType: string }> {
    const c = this.context(rc);
    const membershipId = c.membershipId;
    if (!membershipId) {
      throw new WonFlowApiError(401, "membership-required", "You must be signed in with a hospital membership.");
    }
    const membership = await database.tenantMembership.findFirst({
      where: { id: membershipId, tenantId: c.tenantId },
      select: { photoObjectKey: true },
    });
    if (!membership?.photoObjectKey) {
      throw new WonFlowApiError(404, "avatar-not-found", "No avatar photo uploaded.");
    }
    const bytes = await readFile(documentObjectPath(membership.photoObjectKey));
    let contentType = "image/jpeg";
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      contentType = "image/png";
    } else if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
      contentType = "image/webp";
    }
    return { bytes, contentType };
  }
}
export const hospitalAdministrationService=new HospitalAdministrationService();
