import { ExternalLink, MapPin, Phone } from "lucide-react";
import { createPatientAppointmentMapUrl } from "./patient-appointment-map";
interface Props { name: string; addressLines: readonly string[]; locality?: string; region?: string; postalCode?: string; phone?: string; latitude?: number; longitude?: number; patientInstructions?: string }
export function PatientAppointmentLocationCard(props: Props) {
  const hasAddress = props.addressLines.some(Boolean) || [props.locality, props.region, props.postalCode].some(Boolean);
  const hasCoordinates = props.latitude !== undefined && props.longitude !== undefined;
  const mapUrl = hasAddress || hasCoordinates ? createPatientAppointmentMapUrl({ ...props, locationName: props.name }) : undefined;
  return <section aria-labelledby="appointment-location-heading" className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4">
    <div className="flex items-start gap-3"><MapPin aria-hidden className="mt-1 shrink-0 text-cyan-800" size={20}/><div><p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">Appointment location</p><h2 id="appointment-location-heading" className="mt-1 text-sm font-black text-slate-950">{props.name}</h2>{hasAddress ? <address className="mt-2 text-xs font-semibold not-italic leading-5 text-slate-700">{props.addressLines.map((line) => <span className="block" key={line}>{line}</span>)}<span>{[props.locality, props.region, props.postalCode].filter(Boolean).join(", ")}</span></address> : null}</div></div>
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">{mapUrl ? <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-800 px-4 text-sm font-black text-white" href={mapUrl} rel="noreferrer" target="_blank"><ExternalLink aria-hidden size={15}/>Open map</a> : null}{props.phone ? <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300 bg-white px-4 text-sm font-black text-cyan-900" href={`tel:${props.phone}`}><Phone aria-hidden size={15}/>Call location</a> : null}</div>
    {props.patientInstructions ? <div className="mt-4 rounded-xl border border-cyan-200 bg-white p-3"><p className="text-[10px] font-black uppercase text-cyan-700">Arrival instructions</p><p className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-6 text-slate-700">{props.patientInstructions}</p></div> : null}
  </section>;
}
