"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  APPLIANCES, CATEGORIES, LOCATIONS, MAIN_SITE, OFFICE_PHONE_DISPLAY, OFFICE_PHONE_TEL,
  PRIVACY_URL, STEPS, TIME_WINDOWS, URGENCY, categoryLabel, urgencyLabel, type StepKey,
} from "@/lib/content";
import { emptyDraft, type ContactDetails, type MediaItem, type RequestDraft, type SubmitResult } from "@/lib/types";
import { submitMaintenanceRequest } from "@/lib/submit-request";
import MediaUploader from "./MediaUploader";
import { CategoryIcon, IconArrowLeft, IconArrowRight, IconCheck, IconLock, IconPhone } from "./icons";

const REMEMBER_KEY = "sfpm.contact.v1";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
type Errors = Partial<Record<string, string>>;

const digits = (s: string) => s.replace(/\D/g, "");
const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

function validate(step: StepKey, d: RequestDraft, media: MediaItem[]): Errors {
  const e: Errors = {};
  switch (step) {
    case "category":
      if (!d.category) e.category = "Choose the type of issue to continue.";
      break;
    case "issue":
      if (d.category === "appliance" && !d.appliance) e.appliance = "Choose which appliance.";
      if (d.category !== "other" && d.issues.length === 0) e.issues = "Tap at least one option that matches the problem.";
      break;
    case "urgency":
      if (!d.urgency) e.urgency = "Choose how urgent this is.";
      break;
    case "photos":
      if (media.some((m) => m.status === "processing")) e.media = "Your photos are still being prepared. One moment.";
      break;
    case "description":
      if ((d.category === "other" || d.issues.length === 0) && d.description.trim().length < 10)
        e.description = "Please describe the problem in a sentence or two.";
      break;
    case "contact":
      if (d.name.trim().length < 2) e.name = "Enter your full name.";
      if (digits(d.phone).length < 10) e.phone = "Enter a phone number with area code.";
      if (!emailOk(d.email)) e.email = "Enter a valid email address, like name@example.com.";
      if (d.address.trim().length < 5) e.address = "Enter the property address.";
      break;
    case "access":
      if (d.times.length === 0) e.times = "Choose at least one time that works.";
      break;
    case "review":
      if (!d.consent) e.consent = "Please confirm before submitting.";
      break;
  }
  return e;
}

/* ---------- small building blocks ---------- */

function Chip({ type, name, checked, onChange, children }: {
  type: "checkbox" | "radio"; name: string; checked: boolean; onChange: () => void; children: ReactNode;
}) {
  return (
    <label className="chip">
      <input type={type} name={name} checked={checked} onChange={onChange} />
      <span className="chip-tick" aria-hidden="true"><IconCheck size={14} /></span>
      <span>{children}</span>
    </label>
  );
}

function Field({ id, label, hint, error, optional, children }: {
  id: string; label: string; hint?: string; error?: string; optional?: boolean; children: ReactNode;
}) {
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={id} className="field-label">
        {label}{optional && <span className="field-optional"> Optional</span>}
      </label>
      {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
      {children}
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
    </div>
  );
}

const describedBy = (id: string, errors: Errors, hint = false) =>
  [hint ? `${id}-hint` : "", errors[id] ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;

function GroupError({ id, msg }: { id: string; msg?: string }) {
  return msg ? <p id={`${id}-error`} className="field-error">{msg}</p> : null;
}

function EmergencyNotice() {
  return (
    <div className="emergency" role="alert">
      <p className="emergency-eyebrow">Emergency</p>
      <p className="emergency-title">Please call us now.</p>
      <p className="emergency-body">
        For a gas smell, flooding, fire or smoke, or no heat in winter, phone the office right away rather than waiting on this form.
        If there is fire, smoke or a smell of gas, leave the unit first and call 911.
      </p>
      <a className="btn btn-alert btn-block" href={`tel:${OFFICE_PHONE_TEL}`}>
        <IconPhone size={20} /><span>Call {OFFICE_PHONE_DISPLAY}</span>
      </a>
      <p className="emergency-foot">Once you have called, you can continue here to log it in writing with photos.</p>
    </div>
  );
}

function TrustLine({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`trust${compact ? " trust-compact" : ""}`}>
      <p className="trust-row"><IconLock size={16} /><span>Encrypted in transit</span></p>
      <p className="trust-note">
        Your details are used only to handle this request.{" "}
        <a href={PRIVACY_URL} target="_blank" rel="noopener">Privacy policy</a>
      </p>
    </div>
  );
}

/* ---------- the wizard ---------- */

export default function Portal() {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<RequestDraft>(emptyDraft);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [remembered, setRemembered] = useState(false);
  const [returnToReview, setReturnToReview] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  const key = STEPS[step].key;
  const total = STEPS.length;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return;
      const c = JSON.parse(raw) as Partial<ContactDetails>;
      setD((x) => ({ ...x, name: c.name ?? "", phone: c.phone ?? "", email: c.email ?? "",
        address: c.address ?? "", unit: c.unit ?? "", rememberContact: true }));
      setRemembered(true);
    } catch { /* storage unavailable: carry on */ }
  }, []);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    // Instant jump to the top of the new step (the page scrolls inside .page on phones).
    document.querySelector<HTMLElement>(".page")?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    headingRef.current?.focus({ preventScroll: true });
  }, [step, result]);

  const set = <K extends keyof RequestDraft>(k: K, v: RequestDraft[K]) => {
    setD((x) => ({ ...x, [k]: v }));
    if (errors[k as string]) setErrors((e) => ({ ...e, [k as string]: undefined }));
  };
  const toggle = (k: "issues" | "times", v: string) => {
    setD((x) => {
      let next = x[k].includes(v) ? x[k].filter((i) => i !== v) : [...x[k], v];
      if (k === "times") next = v === "Any time" ? (next.includes(v) ? ["Any time"] : []) : next.filter((i) => i !== "Any time");
      return { ...x, [k]: next };
    });
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const onMedia = useCallback((u: (p: MediaItem[]) => MediaItem[]) => {
    setMedia(u);
    setErrors((e) => ({ ...e, media: undefined }));
  }, []);

  const focusFirstError = (e: Errors) => {
    const first = Object.keys(e)[0];
    requestAnimationFrame(() => {
      const el = document.getElementById(first) ?? document.querySelector<HTMLElement>(`[data-group="${first}"] input`);
      el?.focus();
    });
  };

  const next = async () => {
    const e = validate(key, d, media);
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(e); return; }
    if (key !== "review") {
      if (returnToReview) { setReturnToReview(false); setStep(total - 1); } else setStep((s) => s + 1);
      return;
    }
    setSending(true);
    try {
      const now = new Date().toISOString();
      const { consent: _c, rememberContact, ...fields } = d;
      void _c;
      const res = await submitMaintenanceRequest({
        ...fields, consentAt: now, submittedAt: now,
        attachments: media.filter((m) => m.blob).map((m) => ({ name: m.name, kind: m.kind, bytes: m.finalBytes, caption: m.caption, blob: m.blob! })),
      });
      try {
        if (rememberContact) {
          const { name, phone, email, address, unit } = d;
          localStorage.setItem(REMEMBER_KEY, JSON.stringify({ name, phone, email, address, unit }));
        } else localStorage.removeItem(REMEMBER_KEY);
      } catch { /* ignore */ }
      setResult(res);
    } finally { setSending(false); }
  };
  // Tapping a tile only selects it; the tenant moves on with Continue.
  const needsChoice = (key === "category" && !d.category) || (key === "urgency" && !d.urgency);
  const back = () => { setErrors({}); setReturnToReview(false); setStep((s) => Math.max(0, s - 1)); };
  const goto = (k: StepKey) => { setErrors({}); setReturnToReview(true); setStep(STEPS.findIndex((s) => s.key === k)); };
  const forget = () => {
    try { localStorage.removeItem(REMEMBER_KEY); } catch { /* ignore */ }
    setRemembered(false);
    setD((x) => ({ ...x, name: "", phone: "", email: "", address: "", unit: "", rememberContact: false }));
  };
  const restart = () => {
    media.forEach((m) => URL.revokeObjectURL(m.previewUrl));
    setMedia([]);
    setResult(null);
    setErrors({});
    setStep(0);
    setD((x) => ({ ...emptyDraft, ...(x.rememberContact ? { name: x.name, phone: x.phone, email: x.email, address: x.address, unit: x.unit, rememberContact: true } : {}) }));
  };

  const cat = CATEGORIES.find((c) => c.value === d.category);
  const stepTitle = key === "issue" ? `${cat?.label ?? "The problem"}: what's wrong?` : STEPS[step].title;
  const errorCount = Object.values(errors).filter(Boolean).length;
  const done = !!result;

  /* ---------- step bodies ---------- */
  const body = (): ReactNode => {
    switch (key) {
      case "category":
        return (
          <fieldset className="group" aria-labelledby="step-title" data-group="category">
            <div className="tiles">
              {CATEGORIES.map((c) => (
                <label key={c.value} className="tile">
                  <input type="radio" name="category" id={c.value === CATEGORIES[0].value ? "category" : undefined}
                    checked={d.category === c.value}
                    onChange={() => { setD((x) => ({ ...x, category: c.value, issues: x.category === c.value ? x.issues : [], appliance: x.category === c.value ? x.appliance : "" })); setErrors({}); }} />
                  <span className="tile-icon"><CategoryIcon name={c.value} /></span>
                  <span className="tile-label">{c.label}</span>
                  <span className="tile-tick" aria-hidden="true"><IconCheck size={14} /></span>
                </label>
              ))}
            </div>
            <GroupError id="category" msg={errors.category} />
          </fieldset>
        );

      case "issue":
        return (
          <div className="stack-lg">
            {d.category === "appliance" && (
              <fieldset className="group" data-group="appliance">
                <legend className="group-label">Which appliance?</legend>
                <div className="chips">
                  {APPLIANCES.map((a) => (
                    <Chip key={a} type="radio" name="appliance" checked={d.appliance === a} onChange={() => set("appliance", a)}>{a}</Chip>
                  ))}
                </div>
                <GroupError id="appliance" msg={errors.appliance} />
              </fieldset>
            )}
            {cat && cat.issues.length > 0 && (
              <fieldset className="group" data-group="issues">
                <legend className="group-label">{d.category === "appliance" ? "What is it doing?" : "Tap all that apply"}</legend>
                <div className="chips">
                  {cat.issues.map((i) => (
                    <Chip key={i} type="checkbox" name="issues" checked={d.issues.includes(i)} onChange={() => toggle("issues", i)}>{i}</Chip>
                  ))}
                </div>
                <GroupError id="issues" msg={errors.issues} />
              </fieldset>
            )}
            {d.category === "other" && (
              <p className="lede-sm">No problem. You can describe it in your own words in a moment.</p>
            )}
            <fieldset className="group">
              <legend className="group-label">Where is it? <span className="field-optional">Optional</span></legend>
              <div className="chips">
                {LOCATIONS.map((l) => (
                  <Chip key={l} type="radio" name="location" checked={d.location === l} onChange={() => set("location", d.location === l ? "" : l)}>{l}</Chip>
                ))}
              </div>
            </fieldset>
          </div>
        );

      case "urgency":
        return (
          <div className="stack-lg">
            <fieldset className="group" aria-labelledby="step-title" data-group="urgency">
              <div className="options">
                {URGENCY.map((u) => (
                  <label key={u.value} className={`option option-${u.value}`}>
                    <input type="radio" name="urgency" id={u.value === "emergency" ? "urgency" : undefined}
                      checked={d.urgency === u.value} onChange={() => set("urgency", u.value)} />
                    <span className="option-radio" aria-hidden="true" />
                    <span className="option-text">
                      <span className="option-label">{u.label}</span>
                      <span className="option-when">{u.when}</span>
                      <span className="option-examples">{u.examples}</span>
                    </span>
                  </label>
                ))}
              </div>
              <GroupError id="urgency" msg={errors.urgency} />
            </fieldset>
            <div aria-live="polite">{d.urgency === "emergency" && <EmergencyNotice />}</div>
          </div>
        );

      case "photos":
        return (
          <div className="stack-md">
            <p className="lede-sm">Clear photos let us send the right trade, with the right parts, the first time. A short video helps for noises and leaks.</p>
            <MediaUploader items={media} onChange={onMedia} />
            <GroupError id="media" msg={errors.media} />
            {media.length === 0 && <p className="field-hint">Photos are optional, but they usually save a visit.</p>}
          </div>
        );

      case "description": {
        const required = d.category === "other" || d.issues.length === 0;
        return (
          <Field id="description" label={required ? "Describe the problem" : "Notes for the technician"} optional={!required}
            hint="For example: when it started, what you have already tried, or anything we should bring." error={errors.description}>
            <textarea id="description" rows={6} maxLength={1200} value={d.description}
              aria-describedby={describedBy("description", errors, true)} aria-invalid={!!errors.description}
              onChange={(e) => set("description", e.target.value)} />
            <p className="field-count tnum" aria-hidden="true">{d.description.length} / 1200</p>
          </Field>
        );
      }

      case "contact":
        return (
          <div className="stack-md">
            {remembered && (
              <p className="note">
                <IconCheck size={16} />
                <span>We filled in the details saved on this device. <button type="button" className="link" onClick={forget}>Forget them</button></span>
              </p>
            )}
            <Field id="name" label="Full name" error={errors.name}>
              <input id="name" type="text" autoComplete="name" value={d.name} aria-invalid={!!errors.name}
                aria-describedby={describedBy("name", errors)} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <div className="grid-2">
              <Field id="phone" label="Mobile phone" error={errors.phone}>
                <input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={d.phone} aria-invalid={!!errors.phone}
                  aria-describedby={describedBy("phone", errors)} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field id="email" label="Email" error={errors.email}>
                <input id="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={d.email}
                  aria-invalid={!!errors.email} aria-describedby={describedBy("email", errors)} onChange={(e) => set("email", e.target.value)} />
              </Field>
            </div>
            <div className="grid-address">
              <Field id="address" label="Property address" error={errors.address}>
                <input id="address" type="text" autoComplete="street-address" value={d.address} aria-invalid={!!errors.address}
                  aria-describedby={describedBy("address", errors)} onChange={(e) => set("address", e.target.value)} />
              </Field>
              <Field id="unit" label="Unit" optional>
                <input id="unit" type="text" autoComplete="address-line2" value={d.unit} onChange={(e) => set("unit", e.target.value)} />
              </Field>
            </div>
            <label className="check">
              <input type="checkbox" checked={d.rememberContact} onChange={(e) => set("rememberContact", e.target.checked)} />
              <span className="check-box" aria-hidden="true"><IconCheck size={14} /></span>
              <span className="check-text">
                <span className="check-label">Remember my details on this device</span>
                <span className="check-hint">Saved only in this browser, so next time you will not need to retype them. Leave unticked on a shared device.</span>
              </span>
            </label>
          </div>
        );

      case "access":
        return (
          <div className="stack-lg">
            <div className="checks">
              <label className="check">
                <input type="checkbox" checked={d.mayEnter} onChange={(e) => set("mayEnter", e.target.checked)} />
                <span className="check-box" aria-hidden="true"><IconCheck size={14} /></span>
                <span className="check-text">
                  <span className="check-label">Permission to enter if I am not home</span>
                  <span className="check-hint">We will still let you know before anyone enters.</span>
                </span>
              </label>
              <label className="check">
                <input type="checkbox" checked={d.pets} onChange={(e) => set("pets", e.target.checked)} />
                <span className="check-box" aria-hidden="true"><IconCheck size={14} /></span>
                <span className="check-text">
                  <span className="check-label">Pets in the unit</span>
                  <span className="check-hint">So the technician knows before they arrive.</span>
                </span>
              </label>
            </div>
            <fieldset className="group" data-group="times">
              <legend className="group-label">Best times for a visit</legend>
              <div className="chips">
                {TIME_WINDOWS.map((t) => (
                  <Chip key={t} type="checkbox" name="times" checked={d.times.includes(t)} onChange={() => toggle("times", t)}>{t}</Chip>
                ))}
              </div>
              <GroupError id="times" msg={errors.times} />
            </fieldset>
            <Field id="accessNotes" label="Access notes" optional hint="Buzzer code, parking, or where to find a key.">
              <input id="accessNotes" type="text" maxLength={200} value={d.accessNotes} aria-describedby="accessNotes-hint"
                onChange={(e) => set("accessNotes", e.target.value)} />
            </Field>
          </div>
        );

      case "review":
        return (
          <div className="stack-lg">
            {d.urgency === "emergency" && <EmergencyNotice />}
            <ReviewBlock title="The issue" onEdit={() => goto("category")}>
              <Row k="Type" v={categoryLabel(d.category) + (d.appliance ? `, ${d.appliance.toLowerCase()}` : "")} />
              {d.issues.length > 0 && <Row k="Problem" v={d.issues.join(", ")} />}
              {d.location && <Row k="Location" v={d.location} />}
              <Row k="Urgency" v={urgencyLabel(d.urgency)} />
              {d.description.trim() && <Row k="Notes" v={d.description.trim()} />}
            </ReviewBlock>
            <ReviewBlock title={`Photos & video (${media.length})`} onEdit={() => goto("photos")}>
              {media.length ? (
                <ul className="review-thumbs">
                  {media.map((m, i) => (
                    <li key={m.id}>
                      {m.kind === "image"
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={m.previewUrl} alt={m.caption || `Photo ${i + 1}`} />
                        : <video src={`${m.previewUrl}#t=0.1`} muted playsInline preload="metadata" aria-label={m.caption || `Video ${i + 1}`} />}
                      {m.caption && <span>{m.caption}</span>}
                    </li>
                  ))}
                </ul>
              ) : <p className="review-empty">None added</p>}
            </ReviewBlock>
            <ReviewBlock title="Contact" onEdit={() => goto("contact")}>
              <Row k="Name" v={d.name} />
              <Row k="Phone" v={d.phone} />
              <Row k="Email" v={d.email} />
              <Row k="Address" v={[d.unit && `Unit ${d.unit}`, d.address].filter(Boolean).join(", ")} />
            </ReviewBlock>
            <ReviewBlock title="Access" onEdit={() => goto("access")}>
              <Row k="Entry" v={d.mayEnter ? "May enter if I am not home" : "Contact me first"} />
              <Row k="Pets" v={d.pets ? "Yes" : "No"} />
              <Row k="Best times" v={d.times.join(", ")} />
              {d.accessNotes.trim() && <Row k="Notes" v={d.accessNotes.trim()} />}
            </ReviewBlock>
            <div data-group="consent">
              <label className={`check${errors.consent ? " has-error" : ""}`}>
                <input id="consent" type="checkbox" checked={d.consent} aria-invalid={!!errors.consent}
                  aria-describedby={errors.consent ? "consent-error" : undefined} onChange={(e) => set("consent", e.target.checked)} />
                <span className="check-box" aria-hidden="true"><IconCheck size={14} /></span>
                <span className="check-text">
                  <span className="check-label">The details above are accurate</span>
                  <span className="check-hint">and I agree to their use for handling this request, as set out in the <a href={PRIVACY_URL} target="_blank" rel="noopener">privacy policy</a>.</span>
                </span>
              </label>
              <GroupError id="consent" msg={errors.consent} />
            </div>
          </div>
        );
    }
  };

  /* ---------- layout ---------- */
  return (
    <div className="page">
      <a className="skip" href="#main">Skip to the form</a>
      <header className="masthead">
        <div className="masthead-inner">
          <a href={MAIN_SITE} className="brand" aria-label="Stress Free Property Management, main website">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}/brand/logo.svg`} alt="Stress Free Property Management" width={1280} height={240} />
          </a>
          <a className="masthead-call" href={`tel:${OFFICE_PHONE_TEL}`} aria-label={`Call the office, ${OFFICE_PHONE_DISPLAY}`}>
            <IconPhone size={18} /><span className="masthead-call-text">{OFFICE_PHONE_DISPLAY}</span>
          </a>
        </div>
      </header>

      <div className="layout">
        <aside className="rail" aria-label="About this form">
          <div className="rail-inner">
            <p className="eyebrow">Tenant services</p>
            <h1 className="rail-title">Maintenance request</h1>
            <p className="rail-lede">Tell us what needs fixing in a few taps. Your photos go straight to the right trade, every request is triaged by urgency, and you keep a reference for your records.</p>
            <ol className="rail-steps">
              {STEPS.map((s, i) => {
                const state = done || i < step ? "done" : i === step ? "current" : "todo";
                return (
                  <li key={s.key} className={`rail-step is-${state}`} aria-current={!done && i === step ? "step" : undefined}>
                    <span className="rail-num tnum">{state === "done" ? <IconCheck size={14} /> : String(i + 1).padStart(2, "0")}</span>
                    <span className="rail-label">{s.label}</span>
                  </li>
                );
              })}
            </ol>
            <div className="rail-foot">
              <p className="rail-urgent">Emergency? Call <a href={`tel:${OFFICE_PHONE_TEL}`}>{OFFICE_PHONE_DISPLAY}</a></p>
              <TrustLine />
            </div>
          </div>
        </aside>

        <main id="main" className="main" tabIndex={-1}>
          {!done ? (
            <form className="flow" noValidate onSubmit={(e) => { e.preventDefault(); void next(); }}>
              {step === 0 && (
                <div className="mobile-intro">
                  <p className="eyebrow">Tenant services</p>
                  <h1 className="mobile-title">Maintenance request</h1>
                  <p className="mobile-lede">A few taps, a photo or two, and you are done. Every request gets a reference number.</p>
                </div>
              )}
              <div className="progress">
                <div className="progress-meta">
                  <span className="tnum">Step {step + 1} of {total}</span>
                  <span>{STEPS[step].label}</span>
                </div>
                <div className="progress-bar"><span style={{ width: `${((step + 1) / total) * 100}%` }} /></div>
              </div>

              <section key={key} className="step" aria-labelledby="step-title">
                <p className="step-num tnum" aria-hidden="true">{String(step + 1).padStart(2, "0")}</p>
                <h2 id="step-title" ref={headingRef} tabIndex={-1} className="step-title">
                  {stepTitle}
                </h2>
                {errorCount > 1 && (
                  <p className="error-summary" role="alert">Please check the {errorCount} highlighted items.</p>
                )}
                {errorCount === 1 && <p className="error-summary" role="alert">{Object.values(errors).find(Boolean)}</p>}
                <div className="step-body">{body()}</div>
              </section>

              <div className="actions">
                <div className="actions-inner">
                  {step > 0 ? (
                    <button type="button" className="btn btn-ghost" onClick={back}>
                      <IconArrowLeft size={20} /><span>Back</span>
                    </button>
                  ) : null}
                  <button type="submit" className="btn btn-primary btn-next" disabled={sending || needsChoice} aria-busy={sending}>
                    <span>{key === "review" ? (sending ? "Submitting..." : "Submit request") : returnToReview ? "Back to review" : "Continue"}</span>
                    {!sending && <IconArrowRight size={20} />}
                  </button>
                </div>
              </div>
              <div className="mobile-trust"><TrustLine compact /></div>
            </form>
          ) : (
            <Confirmation result={result} d={d} media={media} headingRef={headingRef} onRestart={restart} />
          )}
        </main>
      </div>

      <footer className="footer">
        <div className="footer-inner">
          <p>Stress Free Property Management Inc.</p>
          <p><a href={PRIVACY_URL} target="_blank" rel="noopener">Privacy</a><span aria-hidden="true"> · </span><a href={MAIN_SITE}>stressfreepm.ca</a></p>
        </div>
      </footer>
    </div>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="review-block">
      <div className="review-head">
        <h3>{title}</h3>
        <button type="button" className="link link-edit" onClick={onEdit} aria-label={`Edit ${title}`}>Edit</button>
      </div>
      <dl className="review-list">{children}</dl>
    </section>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (<div className="review-row"><dt>{k}</dt><dd>{v || "None"}</dd></div>);
}

function Confirmation({ result, d, media, headingRef, onRestart }: {
  result: SubmitResult | null; d: RequestDraft; media: MediaItem[];
  headingRef: React.RefObject<HTMLHeadingElement | null>; onRestart: () => void;
}) {
  const [copied, setCopied] = useState(false);
  if (!result) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(result.reference); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch { /* ignore */ }
  };
  const summary = [categoryLabel(d.category), d.appliance, d.issues.join(", ")].filter(Boolean).join(" · ");
  return (
    <section className="confirm step" aria-labelledby="confirm-title">
      <p className="eyebrow eyebrow-accent"><IconCheck size={14} /> Request received</p>
      <h2 id="confirm-title" ref={headingRef} tabIndex={-1} className="confirm-title"><span className="block">Thank you.</span> <span className="block">We have your request.</span></h2>

      <div className="ref">
        <p className="ref-label">Your reference</p>
        <p className="ref-value tnum">{result.reference}</p>
        <button type="button" className="link" onClick={copy} aria-live="polite">{copied ? "Copied" : "Copy reference"}</button>
      </div>

      <dl className="review-list confirm-summary">
        <div className="review-row"><dt>Request</dt><dd>{summary}</dd></div>
        <div className="review-row"><dt>Urgency</dt><dd>{urgencyLabel(d.urgency)}</dd></div>
        <div className="review-row"><dt>Attachments</dt><dd>{media.length ? `${media.length} file${media.length > 1 ? "s" : ""}` : "None"}</dd></div>
        <div className="review-row"><dt>Property</dt><dd>{[d.unit && `Unit ${d.unit}`, d.address].filter(Boolean).join(", ")}</dd></div>
      </dl>

      {d.urgency === "emergency" && <EmergencyNotice />}

      <h3 className="next-title">What happens next</h3>
      <ol className="next-steps">
        <li><span className="next-num tnum">01</span><span><strong>We review and triage it</strong> by urgency, using your photos to choose the right trade.</span></li>
        <li><span className="next-num tnum">02</span><span><strong>We contact you</strong> to confirm a time, and give notice before anyone enters.</span></li>
        <li><span className="next-num tnum">03</span><span><strong>Keep your reference.</strong> Quote it when you call or email, so you and the owner share one record.</span></li>
      </ol>

      {!result.transmitted && (
        <p className="preview-note">
          Preview: this request was not sent and nothing left your device. For anything that needs attention now, please call {OFFICE_PHONE_DISPLAY}.
        </p>
      )}

      <div className="confirm-actions">
        <button type="button" className="btn btn-quiet" onClick={() => window.print()}>Print or save a copy</button>
        <button type="button" className="btn btn-primary" onClick={onRestart}>Start another request</button>
      </div>
    </section>
  );
}
