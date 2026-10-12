export type Category =
  | "plumbing"
  | "electrical"
  | "heating-cooling"
  | "appliance"
  | "pest"
  | "locks-doors"
  | "walls-floors"
  | "alarms"
  | "other";

export type Urgency = "emergency" | "urgent" | "routine";

export interface ContactDetails {
  name: string;
  phone: string;
  email: string;
  address: string;
  unit: string;
}

export interface RequestDraft extends ContactDetails {
  category: Category | "";
  issues: string[];
  appliance: string;
  location: string;
  urgency: Urgency | "";
  description: string;
  mayEnter: boolean;
  pets: boolean;
  times: string[];
  accessNotes: string;
  rememberContact: boolean;
  consent: boolean;
}

export interface MediaItem {
  id: string;
  name: string;
  kind: "image" | "video";
  status: "processing" | "ready" | "error";
  blob: Blob | null;
  previewUrl: string;
  originalBytes: number;
  finalBytes: number;
  compressed: boolean;
  caption: string;
}

export interface MaintenanceRequestPayload
  extends Omit<RequestDraft, "consent" | "rememberContact"> {
  consentAt: string;
  submittedAt: string;
  attachments: { name: string; kind: "image" | "video"; bytes: number; caption: string; blob: Blob }[];
}

export interface SubmitResult {
  ok: boolean;
  reference: string;
  /** false until the backend is wired - nothing leaves the browser in this build */
  transmitted: boolean;
  error?: string;
}

export const emptyDraft: RequestDraft = {
  category: "",
  issues: [],
  appliance: "",
  location: "",
  urgency: "",
  description: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  unit: "",
  mayEnter: false,
  pets: false,
  times: [],
  accessNotes: "",
  rememberContact: false,
  consent: false,
};
