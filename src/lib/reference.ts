// Human-friendly reference: SF-YYMMDD-XXXX (Crockford base32, no 0/O/1/I/L confusion).
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export function makeReference(now = new Date()): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const tail = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `SF-${yy}${mm}${dd}-${tail}`;
}
