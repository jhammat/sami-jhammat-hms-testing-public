import { DoctorVideoRoomWorkspace } from "@/components/doctor/doctor-video-room-workspace";

export const metadata = {
  title: "Live Video Consultation Room | WonFlow Doctor Portal",
  description: "Live WebRTC video consultation room with integrated clinical charting and prescriptions.",
};

export default function DoctorVideoRoomPage() {
  return <DoctorVideoRoomWorkspace />;
}
