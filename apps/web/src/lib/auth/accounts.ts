export type WonFlowRole =
  | "platform" | "admin" | "reception" | "doctor" | "patient"
  | "laboratory" | "radiology" | "pharmacy" | "billing" | "management"
  | "physiotherapist" | "nutritionist";

export function roleForPath(pathname: string): WonFlowRole | null {
  if (pathname.startsWith("/platform")) return "platform";
  if (pathname.startsWith("/admin") || pathname.startsWith("/organization")) return "admin";
  if (pathname.startsWith("/doctor")) return "doctor";
  if (pathname.startsWith("/patient") && pathname !== "/patient/register") return "patient";
  if (pathname.startsWith("/operations/physiotherapy")) return "physiotherapist";
  if (pathname.startsWith("/operations/nutrition")) return "nutritionist";
  if (pathname.startsWith("/management")) return "management";
  if (pathname.startsWith("/operations/laboratory")) return "laboratory";
  if (pathname.startsWith("/operations/radiology")) return "radiology";
  if (pathname.startsWith("/operations/pharmacy")) return "pharmacy";
  if (pathname.startsWith("/operations/billing")) return "billing";
  if (pathname.startsWith("/operations")) return "reception";
  return null;
}

export function homePathForRole(role: WonFlowRole): string {
  return {
    platform: "/platform", admin: "/admin", reception: "/operations/reception",
    doctor: "/doctor", patient: "/patient", laboratory: "/operations/laboratory",
    radiology: "/operations/radiology", pharmacy: "/operations/pharmacy",
    billing: "/operations/billing", management: "/management",
    physiotherapist: "/operations/physiotherapy", nutritionist: "/operations/nutrition",
  }[role];
}
