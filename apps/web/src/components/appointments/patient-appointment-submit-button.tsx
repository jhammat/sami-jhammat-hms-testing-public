"use client";
import { useFormStatus } from "react-dom";
export function PatientAppointmentSubmitButton({ label, pendingLabel, destructive = false }: { label: string; pendingLabel: string; destructive?: boolean }) { const { pending } = useFormStatus(); return <button type="submit" disabled={pending} className={`inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${destructive ? "bg-red-700" : "bg-blue-700"} ${pending ? "opacity-60" : ""}`}>{pending ? pendingLabel : label}</button>; }
