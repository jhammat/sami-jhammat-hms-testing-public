import type { Metadata } from "next";
export function createPatientAppointmentPageMetadata(title: string): Metadata { return { title: `${title} | WonFlow`, robots: { index: false, follow: false } }; }
