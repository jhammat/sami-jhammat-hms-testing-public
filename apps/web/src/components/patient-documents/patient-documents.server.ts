import "server-only";
import type { PatientDocumentScreenModel } from "./patient-document-model";
/** No authenticated patient-account resolver exists yet; never guess an identity. */
export async function loadPatientDocuments():Promise<PatientDocumentScreenModel|undefined>{return undefined}
