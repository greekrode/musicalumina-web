/**
 * Signs kind-4 entry passes (customer teacher) in the scanner's ML2 format:
 *
 *   "ML2:" + base32( 4 | customers.id(16) | exp u32 BE(4) | events.id(16) | hmac-sha256[0..12] )
 *
 * Encode-only copy of musicalumina-qr-scanner/worker/pass.ts (also
 * musicalumina-tools/scripts/qr/pass.ts); the wire format and QR_PASS_SECRET
 * must match the scanner Worker, which verifies the HMAC and then calls
 * check_in_customer_pass.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const MAC_LEN = 12;

function uuidBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/i.test(hex)) throw new Error(`Invalid id: ${uuid}`);
  return Uint8Array.from(hex.match(/../g)!, (pair) => parseInt(pair, 16));
}

function base32(bytes: Uint8Array): string {
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

export async function encodeCustomerPass(
  secret: string,
  customerId: string,
  eventId: string,
  expiresAt: number,
): Promise<string> {
  const body = new Uint8Array(37);
  body[0] = 4;
  body.set(uuidBytes(customerId), 1);
  new DataView(body.buffer).setUint32(17, expiresAt);
  body.set(uuidBytes(eventId), 21);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const tag = new Uint8Array(await crypto.subtle.sign("HMAC", key, body)).slice(0, MAC_LEN);
  const token = new Uint8Array(body.length + MAC_LEN);
  token.set(body);
  token.set(tag, body.length);
  return "ML2:" + base32(token);
}
