export const MOCK_MALE_GIVEN_NAMES = [
  "Aariz",
  "Daniyal",
  "Haris",
  "Ibrahim",
  "Rayan",
  "Saad",
  "Shayan",
  "Taimoor",
  "Zayan",
  "Zohair",
] as const;

export const MOCK_FEMALE_GIVEN_NAMES = [
  "Alina",
  "Anaya",
  "Emaan",
  "Hania",
  "Inaya",
  "Maira",
  "Meher",
  "Rania",
  "Zara",
  "Zoya",
] as const;

export const MOCK_FAMILY_NAMES = [
  "Adeel",
  "Farooq",
  "Hameed",
  "Kamal",
  "Naveed",
  "Qasim",
  "Rahman",
  "Saleem",
  "Tariq",
  "Yousaf",
] as const;

export const MOCK_CITIES = [
  "Islamabad",
  "Rawalpindi",
  "Lahore",
  "Peshawar",
  "Faisalabad",
  "Multan",
  "Sialkot",
  "Abbottabad",
] as const;

export const MOCK_SPECIALTIES = [
  {
    code: "CARD",
    name: "Cardiology",
  },
  {
    code: "GEN-MED",
    name: "General Medicine",
  },
  {
    code: "ORTH",
    name: "Orthopaedics",
  },
  {
    code: "PAED",
    name: "Paediatrics",
  },
  {
    code: "DERM",
    name: "Dermatology",
  },
  {
    code: "ENT",
    name: "ENT",
  },
  {
    code: "SURG",
    name: "General Surgery",
  },
  {
    code: "GYN",
    name: "Gynaecology",
  },
] as const;

export const MOCK_SERVICES = [
  {
    code: "CONSULT-GEN",
    name: "General Consultation",
  },
  {
    code: "CONSULT-CARD",
    name: "Cardiology Consultation",
  },
  {
    code: "CONSULT-ORTH",
    name: "Orthopaedic Consultation",
  },
  {
    code: "CONSULT-PAED",
    name: "Paediatric Consultation",
  },
  {
    code: "FOLLOW-UP",
    name: "Follow-Up Consultation",
  },
  {
    code: "PRE-OP",
    name: "Preoperative Review",
  },
] as const;

export const MOCK_VISIT_REASONS = [
  "Routine medical review",
  "Follow-up after recent treatment",
  "Persistent cough and fatigue",
  "Joint pain and reduced mobility",
  "Blood-pressure review",
  "Childhood fever assessment",
  "Skin irritation assessment",
  "Preoperative clinical review",
] as const;

export const MOCK_BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "O+",
  "O-",
] as const;

export const MOCK_WARDS = [
  {
    wardName: "Demo Medical Ward",
    roomName: "Room M-01",
    bedName: "Bed M-01-A",
  },
  {
    wardName: "Demo Surgical Ward",
    roomName: "Room S-03",
    bedName: "Bed S-03-B",
  },
  {
    wardName: "Demo Paediatric Ward",
    roomName: "Room P-02",
    bedName: "Bed P-02-A",
  },
  {
    wardName: "Demo Cardiac Ward",
    roomName: "Room C-05",
    bedName: "Bed C-05-B",
  },
] as const;