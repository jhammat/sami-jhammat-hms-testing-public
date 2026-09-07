"use client";

import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarDays,
  CalendarPlus,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileHeart,
  FileText,
  FlaskConical,
  Globe,
  HeartPulse,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Phone,
  PhoneCall,
  PhoneOff,
  Pill,
  Plus,
  Printer,
  Radio,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  Video,
  VideoOff,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DoctorPageHeader } from "./doctor-page-header";
import { useDoctorPortalContext } from "./doctor-portal-shell";

import type { VideoAppointmentSummary } from "@/server/doctor/doctor-video-service";

interface SignalRecord {
  id: string;
  signalType: "SDP_OFFER" | "SDP_ANSWER" | "ICE_CANDIDATE" | "CALL_ENDED";
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
  createdAt: string;
}

interface CallConfiguration {
  appointment: {
    id: string;
    startsAt: string;
    endsAt: string;
    patientName: string;
    doctorName: string;
    serviceName: string;
    branchName: string;
    timezone: string;
  };
  role: "PATIENT" | "DOCTOR";
  initiator: boolean;
  canJoin: boolean;
  opensAt: string;
  closesAt: string;
  iceServers: RTCIceServer[];
}

interface PrescriptionRow {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const COMMON_DIAGNOSES = [
  "Acute Upper Respiratory Infection (J06.9)",
  "Essential Hypertension (I10)",
  "Type 2 Diabetes Mellitus (E11.9)",
  "Acute Gastroenteritis (A09)",
  "Post-Operative Recovery / Normal Healing",
  "Tension-type Headache (G44.2)",
  "Allergic Rhinitis (J30.9)",
  "Generalized Anxiety / Stress (F41.1)",
  "Musculoskeletal Back Pain (M54.5)",
  "Iron Deficiency Anemia (D50.9)",
];

const FREQUENCIES = [
  "Once daily (OD - Morning)",
  "Once daily (HS - Bedtime)",
  "Twice daily (BD / 1-0-1)",
  "Thrice daily (TDS / 1-1-1)",
  "Four times daily (QDS)",
  "Every 8 hours",
  "As needed (SOS / PRN)",
];

const INPUT_CLASS = [
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 outline-none transition placeholder:text-slate-400",
  "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100",
  "dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40",
].join(" ");

export function DoctorVideoRoomWorkspace() {
  const { doctor, doctorId, branches } = useDoctorPortalContext();

  const [callsData, setCallsData] = useState<{
    calls: VideoAppointmentSummary[];
    liveCall?: VideoAppointmentSummary;
    upcomingToday: VideoAppointmentSummary[];
    totalOnlineToday: number;
  }>({ calls: [], upcomingToday: [], totalOnlineToday: 0 });

  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<VideoAppointmentSummary | null>(null);

  // Video Call State
  const [callConfig, setCallConfig] = useState<CallConfiguration | null>(null);
  const [callStatus, setCallStatus] = useState<string>("Ready to start video call");
  const [callError, setCallError] = useState<string>("");
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // WebRTC Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const cursorRef = useRef("");
  const queuedCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Clinical Documentation / Charting State (Simultaneous while on call!)
  const [chiefComplaints, setChiefComplaints] = useState("");
  const [bp, setBp] = useState("");
  const [pulse, setPulse] = useState("");
  const [temperature, setTemperature] = useState("");
  const [spO2, setSpO2] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [followUpPlan, setFollowUpPlan] = useState("");
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([
    { id: "1", medicineName: "", dosage: "", frequency: "", duration: "", instructions: "" },
  ]);
  const [isSavingChart, setIsSavingChart] = useState(false);
  const [chartSavedSuccess, setChartSavedSuccess] = useState(false);

  // Quick Start New Instant Call state
  const [quickPatientQuery, setQuickPatientQuery] = useState("");
  const [patientSearchResults, setPatientSearchResults] = useState<Array<{ id: string; patientNumber: string; givenName: string; familyName: string; phone: string }>>([]);
  const [isQuickStarting, setIsQuickStarting] = useState(false);

  // Load all Video Consultations
  const loadCalls = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/doctor/video-consultations", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCallsData(data);
      }
    } catch {
      // transient
    } finally {
      setLoading(false);
    }
  }, []);

  /*
   * The call list: one fetch on mount, then a refresh every fifteen seconds.
   * `loadCalls` touches no state before its first await, so there is no
   * cascading render for the rule to prevent.
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCalls();
    const interval = window.setInterval(() => {
      void loadCalls();
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [loadCalls]);

  /*
   * Timers and room setup.
   *
   * These effects drive a live video call: a per-second call timer, and the
   * room teardown and re-initialisation that has to happen when the doctor
   * switches to a different patient. Both legitimately write state from an
   * effect, which is what `set-state-in-effect` exists to discourage in the
   * ordinary case and cannot express an exception to.
   */
  /* eslint-disable react-hooks/set-state-in-effect */
  // Call timer
  useEffect(() => {
    let interval: number;
    if (connected) {
      interval = window.setInterval(() => {
        setCallDurationSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDurationSeconds(0);
    }
    return () => window.clearInterval(interval);
  }, [connected]);

  // Stop Media & Peer Connection
  const stopMedia = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setScreenSharing(false);
    setJoined(false);
    setConnected(false);
  }, []);

  // WebRTC Signal Sender
  const sendSignal = useCallback(
    async (type: SignalRecord["signalType"], payload: SignalRecord["payload"]) => {
      if (!selectedCall) return;
      try {
        await fetch(`/api/v1/video-consultations/${selectedCall.id}/signals`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type, payload }),
        });
      } catch {}
    },
    [selectedCall],
  );

  // Initialize Room when Selected Call Changes
  useEffect(() => {
    if (!selectedCall) {
      setChiefComplaints("");
      setBp("");
      setPulse("");
      setTemperature("");
      setSpO2("");
      setBloodSugar("");
      setWeightKg("");
      setPrimaryDiagnosis("");
      setClinicalNotes("");
      setFollowUpPlan("");
      setPrescriptions([
        { id: "1", medicineName: "", dosage: "", frequency: "", duration: "", instructions: "" },
      ]);
      setChartSavedSuccess(false);
      setCallConfig(null);
      setCallStatus("Ready to start video call");
      setCallError("");
      return;
    }
    stopMedia();
    setChartSavedSuccess(false);
    setChiefComplaints(selectedCall.reason || "");
    setBp("");
    setPulse("");
    setTemperature("");
    setSpO2("");
    setBloodSugar("");
    setWeightKg("");
    setPrimaryDiagnosis("");
    setClinicalNotes("");
    setFollowUpPlan("");
    setPrescriptions([
      { id: "1", medicineName: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);

    let active = true;
    fetch(`/api/v1/video-consultations/${selectedCall.id}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Unable to load video room config"))))
      .then((data: { call: CallConfiguration }) => {
        if (active) {
          setCallConfig(data.call);
          setCallStatus(
            data.call.canJoin
              ? "🟢 Room is open. Click Join Video Call to connect."
              : `Room opens 15 mins before call time (${new Date(selectedCall.startsAt).toLocaleTimeString()}).`,
          );
        }
      })
      .catch((err) => {
        if (active) setCallError(err.message);
      });

    return () => {
      active = false;
      stopMedia();
    };
  }, [selectedCall?.id, stopMedia]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Flush ICE candidates
  async function flushCandidates(connection: RTCPeerConnection) {
    if (!connection.remoteDescription) return;
    const candidates = queuedCandidatesRef.current.splice(0);
    for (const candidate of candidates) {
      try {
        await connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    }
  }

  // Process Received WebRTC Signals
  const processSignals = useCallback(
    async (records: SignalRecord[]) => {
      const connection = peerRef.current;
      if (!connection || connection.signalingState === "closed") return;
      for (const record of records) {
        cursorRef.current = record.createdAt;
        if (record.signalType === "CALL_ENDED") {
          stopMedia();
          setCallStatus("The patient has disconnected.");
        } else if (record.signalType === "SDP_ANSWER" && callConfig?.role === "DOCTOR") {
          try {
            if (connection.signalingState === "have-local-offer") {
              await connection.setRemoteDescription(new RTCSessionDescription(record.payload as RTCSessionDescriptionInit));
              await flushCandidates(connection);
              setCallStatus("Secure peer connection established.");
            }
          } catch {}
        } else if (record.signalType === "ICE_CANDIDATE") {
          const candidate = record.payload as RTCIceCandidateInit;
          if (connection.remoteDescription) {
            try {
              await connection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {}
          } else {
            queuedCandidatesRef.current.push(candidate);
          }
        }
      }
    },
    [callConfig?.role, stopMedia],
  );

  // Poll for Signals while in call
  useEffect(() => {
    if (!joined || !selectedCall) return;
    let running = false;
    const poll = async () => {
      if (running) return;
      running = true;
      try {
        const res = await fetch(
          `/api/v1/video-consultations/${selectedCall.id}/signals?after=${encodeURIComponent(cursorRef.current)}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const body = (await res.json()) as { signals: SignalRecord[] };
          if (body.signals && body.signals.length > 0) {
            await processSignals(body.signals);
          }
        }
      } catch {}
      finally {
        running = false;
      }
    };
    void poll();
    const interval = window.setInterval(poll, 1000);
    return () => window.clearInterval(interval);
  }, [selectedCall?.id, joined, processSignals]);

  // Join Call Function
  async function joinCall() {
    if (!selectedCall || !callConfig) return;
    setCallError("");
    setCallStatus("Requesting camera and microphone access…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      cursorRef.current = new Date(Date.now() - 5 * 60_000).toISOString();
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      await fetch(`/api/v1/video-consultations/${selectedCall.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "join" }),
      });

      const connection = new RTCPeerConnection({ iceServers: callConfig.iceServers });
      peerRef.current = connection;
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));

      connection.ontrack = (event) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
      };
      connection.onicecandidate = (event) => {
        if (event.candidate) void sendSignal("ICE_CANDIDATE", event.candidate.toJSON());
      };
      connection.onconnectionstatechange = () => {
        const state = connection.connectionState;
        setConnectionState(state);
        setConnected(state === "connected");
        if (state === "connected") setCallStatus("🟢 Live encrypted HD video connected with patient.");
        if (state === "connecting") setCallStatus("Establishing encrypted WebRTC connection…");
      };

      setJoined(true);
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      await sendSignal("SDP_OFFER", offer);
      setCallStatus("Waiting for patient to connect video feed…");
    } catch (err) {
      stopMedia();
      setCallError(err instanceof Error ? err.message : "Camera/Mic permission failed.");
      setCallStatus("Could not join call.");
    }
  }

  // In-Call Controls
  function toggleMic() {
    const next = !micEnabled;
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicEnabled(next);
  }

  function toggleCamera() {
    const next = !cameraEnabled;
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
    setCameraEnabled(next);
  }

  async function toggleScreenShare() {
    if (!screenSharing) {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = display;
        const videoTrack = display.getVideoTracks()[0];
        if (videoTrack && peerRef.current) {
          const sender = peerRef.current.getSenders().find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(videoTrack);
          if (localVideoRef.current) localVideoRef.current.srcObject = display;
          videoTrack.onended = () => void stopScreenShare();
          setScreenSharing(true);
        }
      } catch {}
    } else {
      await stopScreenShare();
    }
  }

  async function stopScreenShare() {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    if (localStreamRef.current && peerRef.current) {
      const origTrack = localStreamRef.current.getVideoTracks()[0];
      const sender = peerRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender && origTrack) sender.replaceTrack(origTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    }
    setScreenSharing(false);
  }

  async function endCall() {
    if (!selectedCall) return;
    try {
      await fetch(`/api/v1/video-consultations/${selectedCall.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });
    } finally {
      stopMedia();
      setCallStatus("Video consultation ended.");
    }
  }

  function copyInviteLink() {
    if (!selectedCall || typeof window === "undefined") return;
    const url = `${window.location.origin}/doctor/appointments/${selectedCall.id}/video`;
    void navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  // Prescription Rx Row Management
  const addPrescriptionRow = () => {
    setPrescriptions((prev) => [
      ...prev,
      { id: String(Date.now()), medicineName: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
  };

  const updatePrescriptionRow = (id: string, field: keyof PrescriptionRow, val: string) => {
    setPrescriptions((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: val } : row)),
    );
  };

  const removePrescriptionRow = (id: string) => {
    if (prescriptions.length === 1) return;
    setPrescriptions((prev) => prev.filter((r) => r.id !== id));
  };

  // Save Clinical Consultation Chart & Issue Digital Rx
  async function handleSaveChart(completeCall = false) {
    if (!selectedCall) return;
    setIsSavingChart(true);
    try {
      const res = await fetch(`/api/v1/doctor/video-consultations/${selectedCall.id}/chart`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chiefComplaints,
          vitals: {
            bloodPressure: bp,
            pulse,
            temperature,
            oxygenSaturation: spO2,
            bloodSugar,
            weightKg,
          },
          primaryDiagnosis,
          clinicalNotes,
          followUpPlan,
          prescriptions: prescriptions.filter((p) => p.medicineName.trim()),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save clinical chart");
      }
      setChartSavedSuccess(true);
      if (completeCall) {
        await endCall();
        setSelectedCall(null);
      }
      void loadCalls();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error saving consultation");
    } finally {
      setIsSavingChart(false);
    }
  }

  // Search and Instant Call Start
  const handleQuickPatientSearch = async (val: string) => {
    setQuickPatientQuery(val);
    if (!val.trim() || val.length < 2) {
      setPatientSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/v1/patients?query=${encodeURIComponent(val.trim())}&pageSize=5`);
      if (res.ok) {
        const data = await res.json();
        setPatientSearchResults(data.patients || []);
      }
    } catch {}
  };

  const startInstantCallWithPatient = async (p: { id: string; patientNumber: string; givenName: string; familyName: string }) => {
    setIsQuickStarting(true);
    try {
      const res = await fetch("/api/v1/doctor/video-consultations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientId: p.id,
          reason: "Instant Tele-Consultation",
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setQuickPatientQuery("");
        setPatientSearchResults([]);
        await loadCalls();
        setSelectedCall({
          id: created.appointmentId,
          patientId: p.id,
          patientName: `${p.givenName} ${p.familyName}`.trim(),
          patientNumber: p.patientNumber,
          patientPhone: "",
          patientGender: "unknown",
          serviceName: "Instant Video Consultation",
          /* The clock is read when this handler runs, not during render —
             it is the moment the instant consultation actually started. */
          /* eslint-disable-next-line react-hooks/purity */
          startsAt: new Date().toISOString(),
          /* eslint-disable-next-line react-hooks/purity */
          endsAt: new Date(Date.now() + 30 * 60000).toISOString(),
          status: "CONFIRMED",
          reason: "Instant Tele-Consultation",
          isLiveNow: true,
          canJoin: true,
          startsInMinutes: 0,
          sessionStatus: "ACTIVE",
        });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start instant video consultation");
    } finally {
      setIsQuickStarting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-5 pb-12">
      <DoctorPageHeader
        description="Encrypted live WebRTC tele-consultation room with real-time vitals, clinical charting, and digital e-prescriptions."
        eyebrow="Tele-Health Desk"
        icon={<Video size={20} />}
        title="Live Video Consultation Room"
      />

      {/* PROMINENT REMINDER & LIVE CALL BANNER */}
      {callsData.liveCall ? (
        <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-700 p-4 text-white shadow-xl shadow-emerald-500/20 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <span className="relative grid size-12 place-items-center rounded-2xl bg-white/20 text-white shadow-inner backdrop-blur-md">
                <Radio className="size-6 animate-pulse text-emerald-200" />
                <span className="absolute -right-1 -top-1 size-3 rounded-full bg-emerald-400 ring-4 ring-emerald-300/40 animate-ping" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-300 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-950">
                    🔴 Live Call Ready
                  </span>
                  <span className="text-xs font-bold text-emerald-100">
                    {callsData.liveCall.serviceName}
                  </span>
                </div>
                <h2 className="text-base font-black tracking-tight sm:text-xl">
                  {callsData.liveCall.patientName} ({callsData.liveCall.patientNumber})
                </h2>
                <p className="text-xs text-emerald-100 font-medium">
                  Complaint: {callsData.liveCall.reason} · Phone: {callsData.liveCall.patientPhone || "N/A"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-xs font-black text-emerald-950 shadow-lg transition hover:scale-[1.03]"
                onClick={() => setSelectedCall(callsData.liveCall!)}
                type="button"
              >
                <Zap className="size-4 text-emerald-600" />
                {selectedCall?.id === callsData.liveCall.id && joined ? "Continue Active Call" : "Connect & Start Video Consultation"}
              </button>
            </div>
          </div>
        </div>
      ) : callsData.upcomingToday.length > 0 ? (
        <div className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/80 p-3.5 text-xs font-bold text-indigo-900 shadow-xs dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-indigo-600 dark:text-indigo-400" />
            <span>
              Next Video Call Today: <strong>{callsData.upcomingToday[0]?.patientName}</strong> at{" "}
              {new Date(callsData.upcomingToday[0]!.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <button
            className="rounded-xl bg-indigo-600 px-3 py-1.5 text-[11px] font-black text-white hover:bg-indigo-700"
            onClick={() => setSelectedCall(callsData.upcomingToday[0]!)}
            type="button"
          >
            Prepare Room
          </button>
        </div>
      ) : null}

      {/* QUICK PATIENT INSTANT VIDEO CALL LAUNCHER */}
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-indigo-600 text-white">
              <Zap className="size-4" />
            </span>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Launch Instant Video Call
              </h3>
              <p className="text-[11px] text-slate-500">
                Start an immediate tele-consultation with any registered patient.
              </p>
            </div>
          </div>

          <div className="relative w-full max-w-sm">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 size-4 text-slate-400" />
              <input
                className={`${INPUT_CLASS} pl-9`}
                onChange={(e) => void handleQuickPatientSearch(e.target.value)}
                placeholder="Search patient name, phone or MRN to call…"
                value={quickPatientQuery}
              />
            </div>

            {/* Quick search dropdown */}
            {patientSearchResults.length > 0 ? (
              <ul className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                {patientSearchResults.map((p) => (
                  <li key={p.id}>
                    <button
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition hover:bg-indigo-50 dark:hover:bg-indigo-950"
                      disabled={isQuickStarting}
                      onClick={() => void startInstantCallWithPatient(p)}
                      type="button"
                    >
                      <div>
                        <span className="font-black text-slate-900 dark:text-white">
                          {p.givenName} {p.familyName}
                        </span>
                        <span className="ml-2 font-mono text-[10px] text-indigo-600">{p.patientNumber}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">
                        <Video size={10} /> Call Now
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      {/* DUAL WORKSPACE: LEFT VIDEO STREAM + RIGHT SIMULTANEOUS CONSULTATION DESK */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.1fr]">
        {/* LEFT COLUMN: WEBRTC VIDEO STREAM */}
        <section className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-slate-900 bg-slate-950 shadow-2xl">
            {/* Call Header info bar */}
            <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/90 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <span
                  className={`size-2.5 rounded-full ${
                    connected ? "bg-emerald-400 animate-pulse" : joined ? "bg-amber-400" : "bg-slate-500"
                  }`}
                />
                <span className="text-xs font-black">
                  {selectedCall ? selectedCall.patientName : "No Call Selected"}
                </span>
                {connected ? (
                  <span className="rounded-md bg-emerald-950 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                    ⏱️ {formatTimer(callDurationSeconds)}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {selectedCall ? (
                  <button
                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-white/20"
                    onClick={copyInviteLink}
                    type="button"
                  >
                    {copiedLink ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    {copiedLink ? "Copied!" : "Invite Link"}
                  </button>
                ) : null}
                <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-300">
                  <ShieldCheck size={12} /> Encrypted
                </span>
              </div>
            </div>

            {/* Video Streams Container */}
            <div className="relative grid min-h-[420px] bg-slate-900 sm:grid-cols-2">
              {/* Remote Patient Video */}
              <div className="relative grid place-items-center border-b border-white/10 sm:border-b-0 sm:border-r">
                <video autoPlay className="h-full max-h-[50vh] w-full object-cover" playsInline ref={remoteVideoRef} />
                {!connected ? (
                  <div className="absolute inset-0 grid place-items-center bg-slate-900/95 p-6 text-center text-white">
                    <div>
                      <Video className="mx-auto size-10 text-cyan-400" />
                      <p className="mt-3 text-sm font-black">{callStatus}</p>
                      {joined && !connected ? (
                        <p className="mt-1 text-xs text-slate-400">Waiting for patient to join video room…</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                  Patient: {selectedCall?.patientName ?? "Patient"} {connected ? "🟢 HD" : ""}
                </span>
              </div>

              {/* Local Doctor Video */}
              <div className="relative grid place-items-center bg-slate-900">
                <video
                  autoPlay
                  className={`h-full max-h-[50vh] w-full ${screenSharing ? "" : "scale-x-[-1]"} object-cover`}
                  muted
                  playsInline
                  ref={localVideoRef}
                />
                {!joined ? (
                  <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-center text-white">
                    <div>
                      <Camera className="mx-auto size-10 text-cyan-400" />
                      <h4 className="mt-2 text-sm font-black">Doctor Camera Preview</h4>
                      <p className="mt-1 text-xs text-slate-300">
                        {selectedCall
                          ? `Ready to consult with ${selectedCall.patientName}.`
                          : "Select an appointment from schedule."}
                      </p>
                      {selectedCall ? (
                        <button
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-lg hover:scale-105"
                          onClick={() => void joinCall()}
                          type="button"
                        >
                          <Video size={14} />
                          Join Video Call
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
                  You ({doctor?.displayName ?? "Doctor"}) {screenSharing ? "• Screen Sharing" : ""}
                </span>
              </div>
            </div>

            {/* In-Call Controls Bar */}
            {joined ? (
              <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 bg-slate-950 p-3.5">
                <button
                  aria-label="Toggle Microphone"
                  className={`grid size-10 place-items-center rounded-full transition ${
                    micEnabled ? "bg-white/15 text-white hover:bg-white/25" : "bg-amber-600 text-white"
                  }`}
                  onClick={toggleMic}
                  type="button"
                >
                  {micEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                </button>

                <button
                  aria-label="Toggle Camera"
                  className={`grid size-10 place-items-center rounded-full transition ${
                    cameraEnabled ? "bg-white/15 text-white hover:bg-white/25" : "bg-amber-600 text-white"
                  }`}
                  onClick={toggleCamera}
                  type="button"
                >
                  {cameraEnabled ? <Camera size={16} /> : <CameraOff size={16} />}
                </button>

                <button
                  aria-label="Share Screen"
                  className={`grid size-10 place-items-center rounded-full transition ${
                    screenSharing ? "bg-indigo-600 text-white" : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                  onClick={() => void toggleScreenShare()}
                  type="button"
                >
                  {screenSharing ? <MonitorOff size={16} /> : <Monitor size={16} />}
                </button>

                <button
                  aria-label="End Consultation Call"
                  className="grid size-10 place-items-center rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-md"
                  onClick={() => void endCall()}
                  type="button"
                >
                  <PhoneOff size={16} />
                </button>
              </div>
            ) : null}
          </div>

          {/* Today's Video Call Queue List */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <CalendarDays className="size-4 text-indigo-500" />
              Today&apos;s Video Consultation Schedule ({callsData.calls.length})
            </h3>

            {callsData.calls.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">No online video consultations booked for today yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                {callsData.calls.map((call) => {
                  const isSelected = selectedCall?.id === call.id;
                  return (
                    <li key={call.id}>
                      <button
                        className={`flex w-full items-center justify-between p-2.5 text-left rounded-2xl transition ${
                          isSelected
                            ? "bg-indigo-50 dark:bg-indigo-950/60 ring-1 ring-indigo-300 dark:ring-indigo-700"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                        onClick={() => setSelectedCall(call)}
                        type="button"
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid size-8 place-items-center rounded-xl bg-indigo-600 font-bold text-white text-[11px]">
                            {call.patientName.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <p className="text-xs font-black text-slate-950 dark:text-white">{call.patientName}</p>
                            <p className="text-[10px] text-slate-500">
                              {new Date(call.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                              {call.reason}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {call.isLiveNow ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-800 animate-pulse">
                              🔴 Live
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              Scheduled
                            </span>
                          )}
                          <ArrowRight className="size-3 text-slate-400" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: SIMULTANEOUS CLINICAL CONSULTATION DESK (CHART WHILE CALLING!) */}
        <section className="space-y-4">
          <div className="rounded-3xl border border-indigo-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Header with Patient Quick Badge */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Stethoscope className="size-4 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-950 dark:text-white">
                  Simultaneous Clinical Chart &amp; Rx
                </h3>
              </div>
              {selectedCall ? (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    MRN: {selectedCall.patientNumber}
                  </span>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    onClick={() => {
                      stopMedia();
                      setSelectedCall(null);
                    }}
                    title="Deselect patient"
                    type="button"
                  >
                    <X size={12} /> Deselect
                  </button>
                </div>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  No Patient Selected
                </span>
              )}
            </div>

            {selectedCall ? (
              <>
                {/* Active Consultation Patient Strip */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-xs font-black text-white shadow-xs">
                      {selectedCall.patientName.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-950 dark:text-white">
                          {selectedCall.patientName}
                        </h4>
                        <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-800 dark:bg-indigo-900/80 dark:text-indigo-200">
                          MRN: {selectedCall.patientNumber}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {selectedCall.patientAge ? `${selectedCall.patientAge} yrs • ` : ""}
                        {selectedCall.patientGender !== "unknown" ? `${selectedCall.patientGender} • ` : ""}
                        {selectedCall.reason || selectedCall.serviceName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-2xs dark:bg-slate-900 dark:text-slate-300">
                      {new Date(selectedCall.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {chartSavedSuccess ? (
                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-5 text-emerald-600" />
                      <h4 className="font-black text-xs">Consultation Chart &amp; Digital Rx Issued!</h4>
                    </div>
                    <p className="mt-1 text-[11px]">
                      The prescription and clinical notes are now active and synced to the patient portal at <strong>/patient</strong>.
                    </p>
                  </div>
                ) : null}

                {/* Vitals Input Row */}
                <div className="mt-4 space-y-3">
                  <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Patient Vitals
                  </span>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">BP (mmHg)</label>
                      <input className={INPUT_CLASS} onChange={(e) => setBp(e.target.value)} placeholder="120/80" value={bp} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Pulse (bpm)</label>
                      <input className={INPUT_CLASS} onChange={(e) => setPulse(e.target.value)} placeholder="76" value={pulse} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Temp (°F)</label>
                      <input className={INPUT_CLASS} onChange={(e) => setTemperature(e.target.value)} placeholder="98.6" value={temperature} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">SpO2 (%)</label>
                      <input className={INPUT_CLASS} onChange={(e) => setSpO2(e.target.value)} placeholder="99" value={spO2} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Sugar (mg/dL)</label>
                      <input className={INPUT_CLASS} onChange={(e) => setBloodSugar(e.target.value)} placeholder="110" value={bloodSugar} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Weight (kg)</label>
                      <input className={INPUT_CLASS} onChange={(e) => setWeightKg(e.target.value)} placeholder="70" value={weightKg} />
                    </div>
                  </div>
                </div>

                {/* Chief Complaints & History */}
                <div className="mt-4 space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Chief Complaints &amp; Clinical History
                  </label>
                  <textarea
                    className={`${INPUT_CLASS} min-h-16 py-2`}
                    onChange={(e) => setChiefComplaints(e.target.value)}
                    placeholder="Patient symptoms, fever onset, duration, previous medication response..."
                    value={chiefComplaints}
                  />
                </div>

                {/* Diagnosis Selection */}
                <div className="mt-4 space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Primary Diagnosis (ICD-10)
                  </label>
                  <input
                    className={INPUT_CLASS}
                    onChange={(e) => setPrimaryDiagnosis(e.target.value)}
                    placeholder="e.g. Acute Bronchitis, Essential Hypertension, Viral Fever"
                    value={primaryDiagnosis}
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {COMMON_DIAGNOSES.slice(0, 4).map((d) => (
                      <button
                        className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-300"
                        key={d}
                        onClick={() => setPrimaryDiagnosis(d)}
                        type="button"
                      >
                        + {d.split("(")[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interactive Prescription Pad */}
                <div className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
                      <Pill className="size-4 text-indigo-600" />
                      <span>Digital Prescription (Rx)</span>
                    </div>
                    <button
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-black text-white hover:bg-indigo-700"
                      onClick={addPrescriptionRow}
                      type="button"
                    >
                      <Plus size={12} /> Add Medicine
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {prescriptions.map((row, idx) => (
                      <div
                        className="grid gap-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800 sm:grid-cols-[1.5fr_0.8fr_1fr_0.8fr_auto]"
                        key={row.id}
                      >
                        <div>
                          <label className="text-[9px] font-bold text-slate-500">Medicine Name</label>
                          <input
                            className={INPUT_CLASS}
                            onChange={(e) => updatePrescriptionRow(row.id, "medicineName", e.target.value)}
                            placeholder="e.g. Tab Panadol 500mg, Cap Augmentin 625mg"
                            value={row.medicineName}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500">Dosage</label>
                          <input
                            className={INPUT_CLASS}
                            onChange={(e) => updatePrescriptionRow(row.id, "dosage", e.target.value)}
                            placeholder="1 Tab"
                            value={row.dosage}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500">Frequency</label>
                          <select
                            className={INPUT_CLASS}
                            onChange={(e) => updatePrescriptionRow(row.id, "frequency", e.target.value)}
                            value={row.frequency}
                          >
                            {FREQUENCIES.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500">Duration</label>
                          <input
                            className={INPUT_CLASS}
                            onChange={(e) => updatePrescriptionRow(row.id, "duration", e.target.value)}
                            placeholder="5 Days"
                            value={row.duration}
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            className="mb-1 rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950"
                            onClick={() => removePrescriptionRow(row.id)}
                            title="Remove medicine"
                            type="button"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clinical Notes & Follow-up Plan */}
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Follow-up &amp; Patient Advice
                    </label>
                    <input
                      className={INPUT_CLASS}
                      onChange={(e) => setFollowUpPlan(e.target.value)}
                      placeholder="e.g. Rest, drink plenty of fluids, follow-up in 5 days if fever persists"
                      value={followUpPlan}
                    />
                  </div>
                </div>

                {/* Chart Action Buttons */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 px-5 text-xs font-black text-white shadow-lg shadow-indigo-500/25 transition hover:scale-[1.02] disabled:opacity-50"
                    disabled={isSavingChart || !selectedCall}
                    onClick={() => void handleSaveChart(false)}
                    type="button"
                  >
                    <Send className="size-4" />
                    {isSavingChart ? "Saving & Syncing Rx…" : "💾 Save & Issue Prescription to Patient"}
                  </button>

                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                    disabled={isSavingChart || !selectedCall}
                    onClick={() => void handleSaveChart(true)}
                    type="button"
                  >
                    <Check className="size-4" />
                    Complete &amp; Conclude Visit
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="relative grid size-16 place-items-center rounded-3xl bg-gradient-to-tr from-indigo-500/10 via-indigo-500/20 to-purple-500/20 text-indigo-600 shadow-inner dark:bg-indigo-950/40 dark:text-indigo-400">
                  <Stethoscope className="size-8" />
                </div>
                <h4 className="mt-4 text-base font-black text-slate-900 dark:text-white">
                  No Patient Selected
                </h4>
                <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                  Patient vitals, clinical history, and digital prescription pad will be visible once you select a patient in the online appointment.
                </p>

                <div className="mt-6 w-full max-w-sm space-y-2.5">
                  <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 text-left transition dark:border-indigo-950 dark:bg-indigo-950/30">
                    <div className="grid size-7 shrink-0 place-items-center rounded-xl bg-indigo-600 text-[11px] font-black text-white shadow-xs">
                      1
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-white">From Schedule:</strong> Click any scheduled consultation under &ldquo;Today&apos;s Video Consultation Schedule&rdquo;.
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-3 text-left transition dark:border-violet-950 dark:bg-violet-950/30">
                    <div className="grid size-7 shrink-0 place-items-center rounded-xl bg-violet-600 text-[11px] font-black text-white shadow-xs">
                      2
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-white">Instant Call:</strong> Search any registered patient in the search box above to start an instant tele-consult.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
