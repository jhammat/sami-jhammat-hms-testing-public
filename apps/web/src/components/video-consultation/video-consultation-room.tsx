"use client";

import { Camera, CameraOff, Mic, MicOff, PhoneOff, ShieldCheck, Video } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface CallConfiguration {
  appointment: { id: string; startsAt: string; endsAt: string; patientName: string; doctorName: string; serviceName: string; branchName: string; timezone: string };
  role: "PATIENT" | "DOCTOR";
  initiator: boolean;
  canJoin: boolean;
  opensAt: string;
  closesAt: string;
  iceServers: RTCIceServer[];
}

interface SignalRecord { id: string; signalType: "SDP_OFFER" | "SDP_ANSWER" | "ICE_CANDIDATE" | "CALL_ENDED"; payload: RTCSessionDescriptionInit | RTCIceCandidateInit; createdAt: string }

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json() as T & { error?: string; message?: string };
  if (!response.ok) throw new Error(body.error ?? body.message ?? "The video-call request failed.");
  return body;
}

export function VideoConsultationRoom({ appointmentId }: { appointmentId: string }) {
  const [configuration, setConfiguration] = useState<CallConfiguration | null>(null);
  const [status, setStatus] = useState("Preparing secure consultation room…");
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const cursor = useRef("");
  const queuedCandidates = useRef<RTCIceCandidateInit[]>([]);

  const signal = useCallback(async (type: SignalRecord["signalType"], payload: SignalRecord["payload"]) => {
    await readJson(await fetch(`/api/v1/video-consultations/${appointmentId}/signals`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, payload }),
    }));
  }, [appointmentId]);

  const stopMedia = useCallback(() => {
    peer.current?.close();
    peer.current = null;
    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/v1/video-consultations/${appointmentId}`, { cache: "no-store" })
      .then((response) => readJson<{ call: CallConfiguration }>(response))
      .then(({ call }) => {
        if (cancelled) return;
        setConfiguration(call);
        setStatus(call.canJoin ? "Check your camera and microphone, then join." : `This room opens at ${new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: call.appointment.timezone }).format(new Date(call.opensAt))}.`);
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "The consultation room could not be loaded."); });
    return () => { cancelled = true; stopMedia(); };
  }, [appointmentId, stopMedia]);

  async function flushCandidates(connection: RTCPeerConnection) {
    if (!connection.remoteDescription) return;
    const candidates = queuedCandidates.current.splice(0);
    for (const candidate of candidates) await connection.addIceCandidate(candidate);
  }

  const processSignals = useCallback(async (records: SignalRecord[]) => {
    const connection = peer.current;
    if (!connection) return;
    for (const record of records) {
      cursor.current = record.createdAt;
      if (record.signalType === "CALL_ENDED") {
        stopMedia();
        setJoined(false);
        setConnected(false);
        setStatus("The other participant ended the consultation.");
      } else if (record.signalType === "SDP_OFFER" && configuration?.role === "PATIENT") {
        await connection.setRemoteDescription(record.payload as RTCSessionDescriptionInit);
        await flushCandidates(connection);
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        await signal("SDP_ANSWER", answer);
        setStatus("Connecting to your doctor…");
      } else if (record.signalType === "SDP_ANSWER" && configuration?.role === "DOCTOR" && !connection.remoteDescription) {
        await connection.setRemoteDescription(record.payload as RTCSessionDescriptionInit);
        await flushCandidates(connection);
      } else if (record.signalType === "ICE_CANDIDATE") {
        const candidate = record.payload as RTCIceCandidateInit;
        if (connection.remoteDescription) await connection.addIceCandidate(candidate);
        else queuedCandidates.current.push(candidate);
      }
    }
  }, [configuration?.role, signal, stopMedia]);

  useEffect(() => {
    if (!joined) return;
    let running = false;
    const poll = async () => {
      if (running) return;
      running = true;
      try {
        const response = await fetch(`/api/v1/video-consultations/${appointmentId}/signals?after=${encodeURIComponent(cursor.current)}`, { cache: "no-store" });
        const body = await readJson<{ signals: SignalRecord[] }>(response);
        await processSignals(body.signals);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Call signaling was interrupted.");
      } finally {
        running = false;
      }
    };
    void poll();
    const interval = window.setInterval(() => { void poll(); }, 1_000);
    return () => window.clearInterval(interval);
  }, [appointmentId, joined, processSignals]);

  async function join() {
    if (!configuration?.canJoin) return;
    setError("");
    setStatus("Requesting camera and microphone permission…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: { echoCancellation: true, noiseSuppression: true } });
      cursor.current = new Date(Date.now() - 5 * 60_000).toISOString();
      localStream.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;
      await readJson(await fetch(`/api/v1/video-consultations/${appointmentId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "join" }) }));
      const connection = new RTCPeerConnection({ iceServers: configuration.iceServers });
      peer.current = connection;
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
      connection.ontrack = (event) => { if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0]; };
      connection.onicecandidate = (event) => { if (event.candidate) void signal("ICE_CANDIDATE", event.candidate.toJSON()); };
      connection.onconnectionstatechange = () => {
        const state = connection.connectionState;
        setConnected(state === "connected");
        if (state === "connected") setStatus("Secure video consultation connected.");
        if (["failed", "disconnected"].includes(state)) setStatus("Connection interrupted. Checking the network…");
      };
      setJoined(true);
      if (configuration.initiator) {
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        await signal("SDP_OFFER", offer);
        setStatus("Waiting for the patient to join…");
      } else {
        setStatus("Waiting for your doctor to join…");
      }
    } catch (cause) {
      stopMedia();
      setError(cause instanceof Error ? cause.message : "Camera and microphone access could not be started.");
      setStatus("Unable to join the consultation.");
    }
  }

  async function endCall() {
    try {
      await fetch(`/api/v1/video-consultations/${appointmentId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "end" }) });
    } finally {
      stopMedia();
      setJoined(false);
      setConnected(false);
      setStatus("The video consultation has ended.");
    }
  }

  function toggleMic() {
    const next = !micEnabled;
    localStream.current?.getAudioTracks().forEach((track) => { track.enabled = next; });
    setMicEnabled(next);
  }

  function toggleCamera() {
    const next = !cameraEnabled;
    localStream.current?.getVideoTracks().forEach((track) => { track.enabled = next; });
    setCameraEnabled(next);
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6" id="main-content">
      <header className="rounded-3xl bg-gradient-to-r from-cyan-600 via-blue-700 to-violet-700 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100">Private online consultation</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">{configuration?.appointment.serviceName ?? "Video consultation"}</h1><p className="mt-2 text-sm text-blue-100">{configuration ? `${configuration.appointment.doctorName} · ${configuration.appointment.patientName}` : "Loading appointment…"}</p></div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-xs font-black"><ShieldCheck className="size-4" /> Appointment-authorized room</span>
        </div>
      </header>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}

      <section className="overflow-hidden rounded-3xl bg-slate-950 shadow-2xl">
        <div className="relative grid min-h-[520px] lg:grid-cols-2">
          <div className="relative grid place-items-center border-b border-white/10 bg-slate-900 lg:border-b-0 lg:border-r">
            <video autoPlay className="h-full max-h-[70vh] w-full object-cover" playsInline ref={remoteVideo} />
            {!connected ? <div className="absolute inset-0 grid place-items-center bg-slate-900/90 text-center text-white"><div><Video className="mx-auto size-12 text-blue-400" /><p className="mt-4 font-black">{status}</p></div></div> : null}
            <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-bold text-white">{configuration?.role === "DOCTOR" ? "Patient" : "Doctor"}</span>
          </div>
          <div className="relative grid place-items-center bg-slate-900">
            <video autoPlay className="h-full max-h-[70vh] w-full scale-x-[-1] object-cover" muted playsInline ref={localVideo} />
            {!joined ? <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-900 to-slate-800 text-white"><div className="max-w-sm p-6 text-center"><Camera className="mx-auto size-12 text-cyan-400" /><p className="mt-4 text-lg font-black">Camera preview</p><p className="mt-2 text-sm text-slate-300">Your browser will ask permission before sharing your camera or microphone.</p><button className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-black text-white disabled:opacity-50" disabled={!configuration?.canJoin} onClick={() => void join()} type="button">Join consultation</button></div></div> : null}
            <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-bold text-white">You</span>
          </div>
        </div>
        {joined ? <div className="flex items-center justify-center gap-3 border-t border-white/10 p-4"><button aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"} className="grid size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={toggleMic} type="button">{micEnabled ? <Mic /> : <MicOff />}</button><button aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"} className="grid size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" onClick={toggleCamera} type="button">{cameraEnabled ? <Camera /> : <CameraOff />}</button><button aria-label="End call" className="grid size-12 place-items-center rounded-full bg-red-600 text-white hover:bg-red-700" onClick={() => void endCall()} type="button"><PhoneOff /></button></div> : null}
      </section>
      <p className="text-center text-xs text-slate-500">Video and audio travel peer-to-peer using WebRTC. WonFlow stores call status and short-lived connection signals, not the media stream.</p>
    </main>
  );
}
