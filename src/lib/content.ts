import type { Category, Urgency } from "./types";

export const OFFICE_PHONE_DISPLAY = "+1 (888) 779-3121";
export const OFFICE_PHONE_TEL = "+18887793121";
export const OFFICE_EMAIL = "info@stressfreepm.ca";
export const PRIVACY_URL = "https://stressfreepm.ca/privacy-policy.html";
export const MAIN_SITE = "https://stressfreepm.ca";

export interface CategoryDef {
  value: Category;
  label: string;
  issues: string[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    value: "plumbing",
    label: "Plumbing",
    issues: ["Leaking faucet", "Clogged drain", "Running toilet", "No hot water", "Low water pressure", "Leak under sink"],
  },
  {
    value: "electrical",
    label: "Electrical",
    issues: ["Outlet not working", "Breaker tripping", "Light fixture out", "Switch not working", "Flickering lights"],
  },
  {
    value: "heating-cooling",
    label: "Heating & cooling",
    issues: ["No heat", "No A/C", "Thermostat issue", "Noisy furnace", "Weak airflow"],
  },
  {
    value: "appliance",
    label: "Appliance",
    issues: ["Not working", "Leaking", "Noisy"],
  },
  {
    value: "pest",
    label: "Pests",
    issues: ["Mice", "Cockroaches", "Bed bugs", "Ants", "Wasps"],
  },
  {
    value: "locks-doors",
    label: "Locks, doors & windows",
    issues: ["Lock or key problem", "Door won't close or latch", "Window won't open or close", "Broken glass", "Screen damaged", "Draft or bad seal"],
  },
  {
    value: "walls-floors",
    label: "Walls, floors & ceiling",
    issues: ["Crack", "Stain", "Water damage", "Hole"],
  },
  {
    value: "alarms",
    label: "Smoke or CO alarm",
    issues: ["Alarm beeping or chirping", "Alarm missing", "Alarm going off"],
  },
  { value: "other", label: "Something else", issues: [] },
];

export const APPLIANCES = ["Fridge", "Stove / oven", "Dishwasher", "Washer", "Dryer", "Microwave", "Range hood"];

export const LOCATIONS = ["Kitchen", "Bathroom", "Bedroom", "Living room", "Laundry", "Exterior", "Common area", "Whole unit"];

export const URGENCY: { value: Urgency; label: string; when: string; examples: string }[] = [
  {
    value: "emergency",
    label: "Emergency",
    when: "Danger to people or the building right now",
    examples: "Gas smell, flooding, fire or smoke, sewage backup, no heat in winter",
  },
  {
    value: "urgent",
    label: "Urgent",
    when: "Needs attention within 24 to 48 hours",
    examples: "No hot water, fridge not cooling, only toilet not working",
  },
  {
    value: "routine",
    label: "Routine",
    when: "Can be booked at a convenient time",
    examples: "Dripping tap, sticky door, loose fixture",
  },
];

export const TIME_WINDOWS = ["Morning", "Afternoon", "Evening", "Any time"];

export const STEPS = [
  { key: "category", label: "Type of issue", title: "What needs attention?" },
  { key: "issue", label: "The problem", title: "" },
  { key: "urgency", label: "Urgency", title: "How urgent is it?" },
  { key: "photos", label: "Photos & video", title: "Show us the problem" },
  { key: "description", label: "Notes", title: "Anything else we should know?" },
  { key: "contact", label: "Your details", title: "Your contact details" },
  { key: "access", label: "Access", title: "Getting into the unit" },
  { key: "review", label: "Review", title: "Review and submit" },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

export const categoryLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? "";
export const urgencyLabel = (v: string) => URGENCY.find((u) => u.value === v)?.label ?? "";
