import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PatientAppointmentPaymentScreen } from "@/components/appointments/patient-appointment-payment-screen";
import { loadPatientAppointmentPayment } from "@/components/appointments/patient-appointment-payment.server";
export const metadata:Metadata={title:"Appointment payment | WonFlow",robots:{index:false,follow:false}};export const dynamic="force-dynamic";export const revalidate=0;
export default async function PatientAppointmentPaymentPage({params}:{params:Promise<{appointmentId:string}>}){const {appointmentId}=await params;const model=await loadPatientAppointmentPayment(appointmentId);if(model===undefined)notFound();return <PatientAppointmentPaymentScreen model={model}/>}
