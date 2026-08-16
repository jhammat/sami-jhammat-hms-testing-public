"use client";

import { useEffect, useRef, useState } from "react";

import {
  DataError,
  DataLoading,
  SaveIndicator,
} from "@wonflow/ui";

import {
  WonFlowActionButton,
  WonFlowOperationalPanel,
  WonFlowPageHeader,
} from "@/components/workspace";

import {
  WonFlowForbiddenError,
} from "@/lib/api";

import {
  patchDoctorQueue,
} from "@/lib/api/doctor-api";

import {
  WonFlowApiError as PhaseOneApiError,
} from "@/lib/api/phase-one-api";

import {
  CONSULTATION_NOTE_TYPE,
  useAddDiagnosis,
  useCreateOrder,
  useCreatePrescription,
  useEncounter,
  useRecordObservation,
  useSaveNoteDraft,
  useSignNote,
} from "@/lib/api/clinical";

import type {
  ConsultationNoteContent,
  DiagnosisCertainty,
  DiagnosticOrderType,
  EncounterRecord,
} from "@/lib/api/clinical";

/**
 * The doctor's clinical workspace for one encounter. The encounter, its
 * note, diagnoses, orders, prescriptions and observations are all
 * server-held (see /api/v1/doctor/encounters/[encounterId] and its
 * sub-routes) — the browser is never the source of truth for whether a
 * patient has been seen, or for what was written about them.
 */

function patientDisplayName(patient: EncounterRecord["patient"]): string {
  return [patient.givenName, patient.middleName, patient.familyName].filter(Boolean).join(" ");
}

function readNoteText(content: unknown): string {
  if (typeof content === "object" && content !== null && "text" in content) {
    const { text } = content as { text?: unknown };
    return typeof text === "string" ? text : "";
  }

  return "";
}

interface ClinicalConsultationDocumentationProps {
  encounterId: string;
}

export function ClinicalConsultationDocumentation({
  encounterId,
}: ClinicalConsultationDocumentationProps) {
  const encounterResource = useEncounter(encounterId);

  if (encounterResource.status === "loading") {
    return (
      <WonFlowOperationalPanel description="Loading the encounter." title="Consultation" tone="blue">
        <DataLoading label="Loading the encounter" shape="detail" />
      </WonFlowOperationalPanel>
    );
  }

  if (encounterResource.status === "error") {
    if (encounterResource.error instanceof WonFlowForbiddenError) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm font-bold text-amber-900">
          You do not have access to this encounter. This requires the encounters.read permission.
        </div>
      );
    }

    return (
      <DataError
        detail={encounterResource.error?.message}
        onRetry={encounterResource.reload}
        what="this encounter"
      />
    );
  }

  if (encounterResource.data === undefined) {
    return null;
  }

  return (
    <ConsultationWorkspace
      encounter={encounterResource.data.encounter}
      reload={encounterResource.reload}
    />
  );
}

function ConsultationWorkspace({
  encounter,
  reload,
}: {
  encounter: EncounterRecord;
  reload: () => void;
}) {
  const [actionMessage, setActionMessage] = useState<string | undefined>();
  const [completing, setCompleting] = useState(false);

  async function completeConsultation(): Promise<void> {
    if (encounter.appointmentId === null) {
      setActionMessage("This encounter has no linked appointment to complete.");
      return;
    }

    setCompleting(true);

    try {
      await patchDoctorQueue(encounter.appointmentId, "complete");
      setActionMessage("Consultation completed.");
      reload();
    } catch (caught) {
      setActionMessage(caught instanceof PhaseOneApiError ? caught.message : "The consultation could not be completed.");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <WonFlowPageHeader
        breadcrumbs={[
          { label: "Clinical", href: "/doctor/consultations" },
          { label: "Encounter" },
        ]}
        description={`${patientDisplayName(encounter.patient)} · ${encounter.patient.patientNumber}`}
        eyebrow="Consultation"
        title={patientDisplayName(encounter.patient)}
        actions={
          encounter.status === "IN_PROGRESS" ? (
            <WonFlowActionButton
              disabled={completing}
              onClick={() => {
                void completeConsultation();
              }}
              variant="primary"
            >
              {completing ? "Completing…" : "Complete Consultation"}
            </WonFlowActionButton>
          ) : undefined
        }
      />

      {actionMessage !== undefined ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">{actionMessage}</div>
      ) : null}

      {encounter.patient.allergies.length > 0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
          Allergies: {encounter.patient.allergies.map((allergy) => allergy.substance).join(", ")}
        </div>
      ) : null}

      <ConsultationNotePanel encounter={encounter} onSaved={reload} />

      <ObservationsPanel encounter={encounter} onSaved={reload} />

      <DiagnosesPanel encounter={encounter} onSaved={reload} />

      <OrdersPanel encounter={encounter} onSaved={reload} />

      <PrescriptionsPanel encounter={encounter} onSaved={reload} />
    </div>
  );
}

function noteAmendsId(content: unknown): string | undefined {
  if (typeof content === "object" && content !== null && "amendsNoteId" in content) {
    const { amendsNoteId } = content as { amendsNoteId?: unknown };
    return typeof amendsNoteId === "string" ? amendsNoteId : undefined;
  }

  return undefined;
}

/**
 * The consultation-note chain: every note has at most one immediate
 * amendment. The tip (not referenced by anything else) is the current
 * note; everything behind it stays fully readable — nothing is ever
 * deleted or hidden.
 */
function buildNoteChain(encounter: EncounterRecord) {
  const notes = encounter.notes
    .filter((note) => note.noteType === CONSULTATION_NOTE_TYPE)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const supersededIds = new Set(notes.map((note) => noteAmendsId(note.content)).filter((id): id is string => id !== undefined));

  const current = notes.filter((note) => !supersededIds.has(note.id)).at(-1);
  const history = notes.filter((note) => note.id !== current?.id);

  return { current, history };
}

/**
 * Autosaves the free-text consultation note while it is a draft, driven by
 * SaveIndicator. A failed save never clears what was typed — only
 * saveState/error change; the textarea keeps the person's text exactly as
 * they left it. Once signed the note is immutable: further edits create a
 * new note referencing it (an amendment) instead of changing it in place,
 * and the original stays visible below, unchanged.
 */
function ConsultationNotePanel({ encounter, onSaved }: { encounter: EncounterRecord; onSaved: () => void }) {
  const { current: currentNote, history } = buildNoteChain(encounter);
  const isDraft = currentNote === undefined || currentNote.status === "DRAFT";

  const [noteText, setNoteText] = useState(() => readNoteText(currentNote?.content));
  const [noteId, setNoteId] = useState(isDraft ? currentNote?.id : undefined);
  const [noteVersion, setNoteVersion] = useState(currentNote?.version);
  const [amending, setAmending] = useState(false);

  const lastSavedTextRef = useRef(noteText);
  const noteIdRef = useRef(noteId);
  const noteVersionRef = useRef(noteVersion);

  useEffect(() => {
    noteIdRef.current = noteId;
  }, [noteId]);

  useEffect(() => {
    noteVersionRef.current = noteVersion;
  }, [noteVersion]);

  const { mutate: saveDraft, saveState, error } = useSaveNoteDraft(encounter.id);
  const { mutate: sign, saveState: signState, error: signError } = useSignNote(encounter.id);

  const encounterEditable = encounter.status === "PLANNED" || encounter.status === "IN_PROGRESS";
  const textEditable = encounterEditable && (isDraft || amending);

  useEffect(() => {
    if (!textEditable || noteText === lastSavedTextRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const content: ConsultationNoteContent = { text: noteText };

      saveDraft({
        noteId: noteIdRef.current,
        noteType: CONSULTATION_NOTE_TYPE,
        content,
        version: noteVersionRef.current,
      })
        .then(({ note }) => {
          lastSavedTextRef.current = noteText;
          setNoteId(note.id);
          setNoteVersion(note.version);
        })
        .catch(() => {
          // saveState/error already carry the failure; noteText is untouched.
        });
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [textEditable, noteText, saveDraft]);

  function startAmendment(): void {
    setAmending(true);
    setNoteText("");
    lastSavedTextRef.current = "";
    setNoteId(undefined);
    setNoteVersion(undefined);
  }

  return (
    <WonFlowOperationalPanel description="Autosaves while drafting. Signed notes are immutable — editing one creates an amendment." title="Consultation Note" tone="blue">
      {!isDraft && !amending ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800">
          Signed {currentNote?.signedAt !== null ? new Date(currentNote?.signedAt ?? "").toLocaleString() : ""} — this note is now immutable.
        </div>
      ) : null}

      <textarea
        className="mt-3 min-h-48 w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-600"
        disabled={!textEditable}
        onChange={(event) => {
          setNoteText(event.target.value);
        }}
        placeholder={amending ? "Amendment to the signed note above…" : "History, examination and clinical reasoning for this consultation…"}
        value={amending ? noteText : isDraft ? noteText : readNoteText(currentNote?.content)}
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <SaveIndicator errorMessage={error?.message} state={amending || isDraft ? saveState : "idle"} />

        <div className="flex items-center gap-2">
          {isDraft && noteId !== undefined && noteText.trim() !== "" ? (
            <WonFlowActionButton
              disabled={signState === "saving"}
              onClick={() => {
                void sign(noteId).then(onSaved);
              }}
            >
              {signState === "saving" ? "Signing…" : "Sign Note"}
            </WonFlowActionButton>
          ) : null}

          {!isDraft && !amending && encounterEditable ? (
            <WonFlowActionButton onClick={startAmendment}>Add Amendment</WonFlowActionButton>
          ) : null}
        </div>
      </div>

      {signError !== undefined ? (
        <p className="mt-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" role="alert">
          {signError instanceof WonFlowForbiddenError
            ? signError.message
            : `The note could not be signed. ${signError.message}`}
        </p>
      ) : null}

      {!encounterEditable && isDraft ? (
        <p className="mt-2 text-xs font-semibold text-slate-500">This encounter is no longer editable.</p>
      ) : null}

      {history.length > 0 ? (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          <div className="text-xs font-black uppercase tracking-wide text-slate-400">Earlier versions (kept, not editable)</div>
          {history.map((note) => (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600" key={note.id}>
              <div className="mb-1 font-bold text-slate-500">
                {note.status === "AMENDED" ? "Amended" : note.status.toLowerCase()} · {new Date(note.createdAt).toLocaleString()}
              </div>
              <p className="whitespace-pre-wrap">{readNoteText(note.content)}</p>
            </div>
          ))}
        </div>
      ) : null}
    </WonFlowOperationalPanel>
  );
}

function ObservationsPanel({ encounter, onSaved }: { encounter: EncounterRecord; onSaved: () => void }) {
  const [code, setCode] = useState("");
  const [display, setDisplay] = useState("");
  const [valueText, setValueText] = useState("");
  const { mutate, saveState, error } = useRecordObservation(encounter.id);

  async function submit(): Promise<void> {
    if (code.trim() === "" || display.trim() === "") return;

    await mutate({
      code: code.trim(),
      display: display.trim(),
      valueText: valueText.trim() || undefined,
      observedAt: new Date().toISOString(),
    });

    setCode("");
    setDisplay("");
    setValueText("");
    onSaved();
  }

  return (
    <WonFlowOperationalPanel description="Vitals and clinical findings recorded during this encounter." title="Observations" tone="violet">
      <div className="grid gap-3 sm:grid-cols-3">
        <input className={fieldClass} onChange={(event) => setCode(event.target.value)} placeholder="Code (e.g. BP)" value={code} />
        <input className={fieldClass} onChange={(event) => setDisplay(event.target.value)} placeholder="Display (e.g. Blood pressure)" value={display} />
        <input className={fieldClass} onChange={(event) => setValueText(event.target.value)} placeholder="Value (e.g. 120/80 mmHg)" value={valueText} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <WonFlowActionButton
          disabled={saveState === "saving" || code.trim() === "" || display.trim() === ""}
          onClick={() => {
            void submit();
          }}
        >
          Record Observation
        </WonFlowActionButton>
        <SaveIndicator errorMessage={error?.message} state={saveState === "saved" ? "idle" : saveState} />
      </div>

      <ul className="mt-4 space-y-2">
        {encounter.patient.observations.map((observation) => (
          <li className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" key={observation.id}>
            <span className="font-bold text-slate-900">{observation.display}</span>{" "}
            <span className="text-slate-600">{observation.valueText ?? observation.valueNumber ?? "—"} {observation.unit ?? ""}</span>
          </li>
        ))}
      </ul>
    </WonFlowOperationalPanel>
  );
}

const CERTAINTY_OPTIONS: readonly DiagnosisCertainty[] = ["PROVISIONAL", "DIFFERENTIAL", "CONFIRMED", "REFUTED"];

function DiagnosesPanel({ encounter, onSaved }: { encounter: EncounterRecord; onSaved: () => void }) {
  const [display, setDisplay] = useState("");
  const [certainty, setCertainty] = useState<DiagnosisCertainty>("PROVISIONAL");
  const { mutate, saveState, error } = useAddDiagnosis(encounter.id);

  async function submit(): Promise<void> {
    if (display.trim() === "") return;
    await mutate({ display: display.trim(), certainty });
    setDisplay("");
    onSaved();
  }

  return (
    <WonFlowOperationalPanel description="Clinical diagnoses recorded for this encounter." title="Diagnoses" tone="amber">
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <input className={fieldClass} onChange={(event) => setDisplay(event.target.value)} placeholder="Diagnosis" value={display} />
        <select className={fieldClass} onChange={(event) => setCertainty(event.target.value as DiagnosisCertainty)} value={certainty}>
          {CERTAINTY_OPTIONS.map((option) => (
            <option key={option} value={option}>{option.charAt(0) + option.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <WonFlowActionButton disabled={saveState === "saving" || display.trim() === ""} onClick={() => { void submit(); }}>
          Add Diagnosis
        </WonFlowActionButton>
        <SaveIndicator errorMessage={error?.message} state={saveState === "saved" ? "idle" : saveState} />
      </div>

      <ul className="mt-4 space-y-2">
        {encounter.diagnoses.map((diagnosis) => (
          <li className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" key={diagnosis.id}>
            <span className="font-bold text-slate-900">{diagnosis.display}</span>{" "}
            <span className="text-slate-500">({diagnosis.certainty.toLowerCase()})</span>
          </li>
        ))}
      </ul>
    </WonFlowOperationalPanel>
  );
}

const ORDER_TYPE_OPTIONS: readonly DiagnosticOrderType[] = ["LABORATORY", "RADIOLOGY"];

function OrdersPanel({ encounter, onSaved }: { encounter: EncounterRecord; onSaved: () => void }) {
  const [type, setType] = useState<DiagnosticOrderType>("LABORATORY");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const { mutate, saveState, error } = useCreateOrder(encounter.id);

  async function submit(): Promise<void> {
    if (code.trim() === "" || name.trim() === "") return;
    await mutate({ type, code: code.trim(), name: name.trim() });
    setCode("");
    setName("");
    onSaved();
  }

  return (
    <WonFlowOperationalPanel description="Laboratory and radiology orders for this encounter." title="Diagnostic Orders" tone="emerald">
      <div className="grid gap-3 sm:grid-cols-[160px_1fr_1fr]">
        <select className={fieldClass} onChange={(event) => setType(event.target.value as DiagnosticOrderType)} value={type}>
          {ORDER_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>{option.charAt(0) + option.slice(1).toLowerCase()}</option>
          ))}
        </select>
        <input className={fieldClass} onChange={(event) => setCode(event.target.value)} placeholder="Code" value={code} />
        <input className={fieldClass} onChange={(event) => setName(event.target.value)} placeholder="Order name" value={name} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <WonFlowActionButton disabled={saveState === "saving" || code.trim() === "" || name.trim() === ""} onClick={() => { void submit(); }}>
          Place Order
        </WonFlowActionButton>
        <SaveIndicator errorMessage={error?.message} state={saveState === "saved" ? "idle" : saveState} />
      </div>

      <ul className="mt-4 space-y-2">
        {encounter.diagnosticOrders.map((order) => (
          <li className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" key={order.id}>
            <span className="font-bold text-slate-900">{order.name}</span>{" "}
            <span className="text-slate-500">({order.type.toLowerCase()} · {order.status.toLowerCase()})</span>
          </li>
        ))}
      </ul>
    </WonFlowOperationalPanel>
  );
}

function PrescriptionsPanel({ encounter, onSaved }: { encounter: EncounterRecord; onSaved: () => void }) {
  const [medicationId, setMedicationId] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");
  const { mutate, saveState, error } = useCreatePrescription(encounter.id);

  async function submit(): Promise<void> {
    if (medicationId.trim() === "" || dose.trim() === "" || frequency.trim() === "") return;

    await mutate({
      items: [{ medicationId: medicationId.trim(), dose: dose.trim(), frequency: frequency.trim() }],
    });

    setMedicationId("");
    setDose("");
    setFrequency("");
    onSaved();
  }

  return (
    <WonFlowOperationalPanel description="Prescriptions issued during this encounter. Medication ID must match an existing catalogue entry — there is no medication lookup yet." title="Prescriptions" tone="slate">
      <div className="grid gap-3 sm:grid-cols-3">
        <input className={fieldClass} onChange={(event) => setMedicationId(event.target.value)} placeholder="Medication ID" value={medicationId} />
        <input className={fieldClass} onChange={(event) => setDose(event.target.value)} placeholder="Dose (e.g. 500mg)" value={dose} />
        <input className={fieldClass} onChange={(event) => setFrequency(event.target.value)} placeholder="Frequency (e.g. twice daily)" value={frequency} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <WonFlowActionButton
          disabled={saveState === "saving" || medicationId.trim() === "" || dose.trim() === "" || frequency.trim() === ""}
          onClick={() => {
            void submit();
          }}
        >
          Add Prescription
        </WonFlowActionButton>
        <SaveIndicator errorMessage={error?.message} state={saveState === "saved" ? "idle" : saveState} />
      </div>

      <ul className="mt-4 space-y-2">
        {encounter.prescriptions.map((prescription) => (
          <li className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" key={prescription.id}>
            {prescription.items.map((item) => (
              <div key={item.id}>
                <span className="font-bold text-slate-900">{item.medication?.name ?? item.medicationId}</span>{" "}
                <span className="text-slate-500">{item.dose} · {item.frequency}</span>
              </div>
            ))}
          </li>
        ))}
      </ul>
    </WonFlowOperationalPanel>
  );
}

const fieldClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
