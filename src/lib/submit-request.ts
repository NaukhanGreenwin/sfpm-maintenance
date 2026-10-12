/**
 * submit-request.ts - the ONLY place a maintenance request leaves the browser.
 *
 * TODO(wire-submit): this build intentionally sends NOTHING. To go live, replace the
 * body of `submitMaintenanceRequest` with the production flow described in BUILD-NOTES.md:
 *
 *   1. POST the JSON fields + a Turnstile token to the API (Cloudflare Worker or Vercel fn)
 *      -> server validates, assigns the reference, returns one short-lived signed PUT URL
 *         per attachment (R2/S3, SSE, 15 min expiry).
 *   2. PUT each `attachments[i].blob` to its signed URL (no credentials in the browser).
 *   3. POST /finalize { reference } -> server emails the office via Microsoft Graph/Resend
 *      and sends the tenant a copy.
 *   4. Return { ok: true, reference, transmitted: true }.
 *
 * Also add the API origin to `connect-src` in the CSP (src/app/layout.tsx).
 * Nothing else in the UI needs to change: the wizard awaits this function and renders
 * the confirmation from its result.
 */
import { makeReference } from "./reference";
import type { MaintenanceRequestPayload, SubmitResult } from "./types";

export async function submitMaintenanceRequest(
  payload: MaintenanceRequestPayload,
): Promise<SubmitResult> {
  void payload; // TODO(wire-submit): send it. Until then it stays in memory and is discarded.
  await new Promise((r) => setTimeout(r, 900)); // keeps the real "sending" state visible
  return { ok: true, reference: makeReference(), transmitted: false };
}
