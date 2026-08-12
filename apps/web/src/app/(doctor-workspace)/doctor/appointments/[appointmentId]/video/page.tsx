import { VideoConsultationRoom } from "@/components/video-consultation/video-consultation-room";
export const dynamic = "force-dynamic";
export default async function DoctorVideoConsultationPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  return <VideoConsultationRoom appointmentId={(await params).appointmentId} />;
}
