"use client";

import { Camera, CameraOff, Check, Copy, Mic, MicOff, Monitor, MonitorOff, PhoneOff, ShieldCheck, Video, Wifi, WifiOff } from "lucide-react";
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

interface SignalRecord {
  id: string;
  signalType: "SDP_OFFER" | "SDP_ANSWER" | "ICE_CANDIDATE" | "CALL_ENDED";
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
  createdAt: string;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string; message?: string };
  if (!response.ok) throw new Error(body.error ?? body.message ?? "The video-call request failed.");
  return body;
}

export function VideoConsultationRoom({ appointmentId }: { appointmentId: string }) {
  const [configuration, setConfiguration] = useState<CallConfiguration | null>(null);
  const [status, setStatus] = useState("Preparing secure consultation room…");
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>("new");
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const screenStream = useRef<MediaStream | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const cursor = useRef("");
  const queuedCandidates = useRef<RTCIceCandidateInit[]>([]);

  const signal = useCallback(
    async (type: SignalRecord["signalType"], payload: SignalRecord["payload"]) => {
      try {
        const response = await fetch(`/api/v1/video-consultations/${appointmentId}/signals`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type, payload }),
        });
        if (response.ok) {
          setError("");
        }
      } catch {
        // Non-fatal candidate retries handled silently
      }
    },
    [appointmentId],
  );

  const stopMedia = useCallback(() => {
    peer.current?.close();
    peer.current = null;
    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;
    screenStream.current?.getTracks().forEach((track) => track.stop());
    screenStream.current = null;
    setScreenSharing(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/v1/video-consultations/${appointmentId}`, { cache: "no-store" })
      .then((response) => readJson<{ call: CallConfiguration }>(response))
      .then(({ call }) => {
        if (cancelled) return;
        setConfiguration(call);
        setStatus(
          call.canJoin
            ? "Ready to connect. Check your camera preview and join."
            : `This room opens at ${new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: call.appointment.timezone }).format(new Date(call.opensAt))}.`,
        );
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "The consultation room could not be loaded.");
      });
    return () => {
      cancelled = true;
      stopMedia();
    };
  }, [appointmentId, stopMedia]);

  async function flushCandidates(connection: RTCPeerConnection) {
    if (!connection.remoteDescription) return;
    const candidates = queuedCandidates.current.splice(0);
    for (const candidate of candidates) {
      try {
        await connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    }
  }

  const processSignals = useCallback(
    async (records: SignalRecord[]) => {
      const connection = peer.current;
      if (!connection || connection.signalingState === "closed") return;
      for (const record of records) {
        cursor.current = record.createdAt;
        if (record.signalType === "CALL_ENDED") {
          stopMedia();
          setJoined(false);
          setConnected(false);
          setStatus("The consultation has been concluded.");
        } else if (record.signalType === "SDP_OFFER" && configuration?.role === "PATIENT") {
          try {
            await connection.setRemoteDescription(new RTCSessionDescription(record.payload as RTCSessionDescriptionInit));
            await flushCandidates(connection);
            const answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            await signal("SDP_ANSWER", answer);
            setStatus("Connecting encrypted channel with doctor…");
          } catch {}
        } else if (record.signalType === "SDP_ANSWER" && configuration?.role === "DOCTOR") {
          try {
            if (connection.signalingState === "have-local-offer") {
              await connection.setRemoteDescription(new RTCSessionDescription(record.payload as RTCSessionDescriptionInit));
              await flushCandidates(connection);
              setStatus("Secure peer connection established.");
            }
          } catch {}
        } else if (record.signalType === "ICE_CANDIDATE") {
          const candidate = record.payload as RTCIceCandidateInit;
          if (connection.remoteDescription) {
            try {
              await connection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch {}
          } else {
            queuedCandidates.current.push(candidate);
          }
        }
      }
    },
    [configuration?.role, signal, stopMedia],
  );

  useEffect(() => {
    if (!joined) return;
    let running = false;
    const poll = async () => {
      if (running) return;
      running = true;
      try {
        const response = await fetch(`/api/v1/video-consultations/${appointmentId}/signals?after=${encodeURIComponent(cursor.current)}`, { cache: "no-store" });
        if (response.ok) {
          const body = (await response.json()) as { signals: SignalRecord[] };
          setError("");
          if (body.signals && body.signals.length > 0) {
            await processSignals(body.signals);
          }
        }
      } catch {
        // Suppress transient poll network drops when connected
      } finally {
        running = false;
      }
    };
    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [appointmentId, joined, processSignals]);

  async function join() {
    if (!configuration?.canJoin) return;
    setError("");
    setStatus("Requesting camera and microphone access…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: { echoCancellation: true, noiseSuppression: true } });
      cursor.current = new Date(Date.now() - 5 * 60_000).toISOString();
      localStream.current = stream;
      if (localVideo.current) localVideo.current.srcObject = stream;
      await readJson(await fetch(`/api/v1/video-consultations/${appointmentId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "join" }) }));
      const connection = new RTCPeerConnection({ iceServers: configuration.iceServers });
      peer.current = connection;
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
      connection.ontrack = (event) => {
        if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0];
      };
      connection.onicecandidate = (event) => {
        if (event.candidate) void signal("ICE_CANDIDATE", event.candidate.toJSON());
      };
      connection.onconnectionstatechange = () => {
        const state = connection.connectionState;
        setConnectionState(state);
        setConnected(state === "connected");
        if (state === "connected") setStatus("Secure encrypted consultation connected.");
        if (state === "connecting") setStatus("Establishing secure WebRTC peer connection…");
        if (["failed", "disconnected"].includes(state)) setStatus("Re-negotiating peer media connection…");
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
      setStatus("Unable to join consultation.");
    }
  }

  async function toggleScreenShare() {
    if (!screenSharing) {
      try {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStream.current = display;
        const videoTrack = display.getVideoTracks()[0];
        if (videoTrack && peer.current) {
          const sender = peer.current.getSenders().find((s) => s.track?.kind === "video");
          if (sender) sender.replaceTrack(videoTrack);
          if (localVideo.current) localVideo.current.srcObject = display;
          videoTrack.onended = () => {
            void stopScreenShare();
          };
          setScreenSharing(true);
        }
      } catch {}
    } else {
      await stopScreenShare();
    }
  }

  async function stopScreenShare() {
    screenStream.current?.getTracks().forEach((t) => t.stop());
    screenStream.current = null;
    if (localStream.current && peer.current) {
      const origVideoTrack = localStream.current.getVideoTracks()[0];
      const sender = peer.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender && origVideoTrack) sender.replaceTrack(origVideoTrack);
      if (localVideo.current) localVideo.current.srcObject = localStream.current;
    }
    setScreenSharing(false);
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
    localStream.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicEnabled(next);
  }

  function toggleCamera() {
    const next = !cameraEnabled;
    localStream.current?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCameraEnabled(next);
  }

  function copyCallLink() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6" id="main-content">
      <header className="rounded-3xl bg-gradient-to-r from-cyan-600 via-blue-700 to-violet-700 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-cyan-100">Private Tele-Consultation</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  connected
                    ? "bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/40"
                    : joined
                    ? "bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/40 animate-pulse"
                    : "bg-white/20 text-white"
                }`}
              >
                {connected ? (
                  <>
                    <Wifi className="size-3 text-emerald-300" /> Live WebRTC HD
                  </>
                ) : joined ? (
                  <>
                    <Wifi className="size-3 text-amber-300" /> Connecting…
                  </>
                ) : (
                  <>
                    <WifiOff className="size-3 text-slate-300" /> Standby
                  </>
                )}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">{configuration?.appointment.serviceName ?? "Video consultation"}</h1>
            <p className="mt-2 text-sm text-blue-100">
              {configuration ? `${configuration.appointment.doctorName} · ${configuration.appointment.patientName} (${configuration.appointment.branchName})` : "Loading appointment…"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyCallLink}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-white/20 px-3.5 py-2 text-xs font-black text-white backdrop-blur hover:bg-white/30"
            >
              {copiedLink ? <Check className="size-4 text-emerald-300" /> : <Copy className="size-4" />}
              <span>{copiedLink ? "Link Copied!" : "Copy Call Link"}</span>
            </button>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-xs font-black">
              <ShieldCheck className="size-4" /> End-to-End Encrypted
            </span>
          </div>
        </div>
      </header>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}

      <section className="overflow-hidden rounded-3xl bg-slate-950 shadow-2xl">
        <div className="relative grid min-h-[520px] lg:grid-cols-2">
          {/* Remote Video Stream */}
          <div className="relative grid place-items-center border-b border-white/10 bg-slate-900 lg:border-b-0 lg:border-r">
            <video autoPlay className="h-full max-h-[70vh] w-full object-cover" playsInline ref={remoteVideo} />
            {!connected ? (
              <div className="absolute inset-0 grid place-items-center bg-slate-900/90 text-center text-white">
                <div className="max-w-xs p-6">
                  <Video className="mx-auto size-12 text-cyan-400" />
                  <p className="mt-4 text-base font-black">{status}</p>
                  {joined && connectionState !== "connected" && (
                    <p className="mt-2 text-xs text-slate-400">Waiting for other participant to share video stream.</p>
                  )}
                </div>
              </div>
            ) : null}
            <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-bold text-white">
              {configuration?.role === "DOCTOR" ? "Patient" : "Doctor"} {connected && "🟢 Live HD"}
            </span>
          </div>

          {/* Local Video Stream / Camera Preview */}
          <div className="relative grid place-items-center bg-slate-900">
            <video autoPlay className={`h-full max-h-[70vh] w-full ${screenSharing ? "" : "scale-x-[-1]"} object-cover`} muted playsInline ref={localVideo} />
            {!joined ? (
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                <div className="max-w-sm p-6 text-center">
                  <Camera className="mx-auto size-12 text-cyan-400" />
                  <p className="mt-4 text-lg font-black">Camera Preview</p>
                  <p className="mt-2 text-sm text-slate-300">Your browser will ask permission before sharing your camera or microphone.</p>
                  <button
                    className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-black text-white shadow-lg hover:bg-blue-700 disabled:opacity-50"
                    disabled={!configuration?.canJoin}
                    onClick={() => void join()}
                    type="button"
                  >
                    Join Video Consultation
                  </button>
                </div>
              </div>
            ) : null}
            <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-bold text-white">
              You ({configuration?.role === "DOCTOR" ? "Doctor" : "Patient"}) {screenSharing && "• Sharing Screen"}
            </span>
          </div>
        </div>

        {/* In-Call Controls */}
        {joined ? (
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 p-4">
            <button
              aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
              className={`grid size-12 place-items-center rounded-full transition ${micEnabled ? "bg-white/10 text-white hover:bg-white/20" : "bg-amber-600 text-white"}`}
              onClick={toggleMic}
              type="button"
              title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
            >
              {micEnabled ? <Mic /> : <MicOff />}
            </button>
            <button
              aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
              className={`grid size-12 place-items-center rounded-full transition ${cameraEnabled ? "bg-white/10 text-white hover:bg-white/20" : "bg-amber-600 text-white"}`}
              onClick={toggleCamera}
              type="button"
              title={cameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
            >
              {cameraEnabled ? <Camera /> : <CameraOff />}
            </button>
            <button
              aria-label="Share screen"
              className={`grid size-12 place-items-center rounded-full transition ${screenSharing ? "bg-indigo-600 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
              onClick={() => void toggleScreenShare()}
              type="button"
              title={screenSharing ? "Stop Sharing Screen" : "Share Screen"}
            >
              {screenSharing ? <MonitorOff /> : <Monitor />}
            </button>
            <button
              aria-label="End call"
              className="grid size-12 place-items-center rounded-full bg-red-600 text-white hover:bg-red-700"
              onClick={() => void endCall()}
              type="button"
              title="End Consultation Call"
            >
              <PhoneOff />
            </button>
          </div>
        ) : null}
      </section>
      <p className="text-center text-xs text-slate-500">
        Encrypted direct WebRTC connection. Audio and video travel peer-to-peer without intermediate storage.
      </p>
    </main>
  );
}

