const encoder = new TextEncoder();
const decoder = new TextDecoder();

const sessionAesKeyPromise = crypto.subtle.generateKey(
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt", "decrypt"]
);

export async function hashPasswordSHA256(password) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(password));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function encryptSensitivePayload(plainObject) {
  const key = await sessionAesKeyPromise;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = encoder.encode(JSON.stringify(plainObject));

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedData
  );

  return {
    ivHex: Array.from(iv)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
    cipherBase64: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)))
  };
}

export function maskCardNumber(cardNumber) {
  const digits = String(cardNumber || "").replace(/\D/g, "");
  if (!digits) return "•••• •••• •••• ••••";
  const last4 = digits.slice(-4);
  return `•••• •••• •••• ${last4}`;
}
export async function cifrarDato(textoPlano) {
  const encoder = new TextEncoder();
  const data = encoder.encode(textoPlano);

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cifradoBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  const bytesCifrados = new Uint8Array(cifradoBuffer);
  const textoCifrado = btoa(String.fromCharCode(...bytesCifrados));
  const ivBase64 = btoa(String.fromCharCode(...iv));

  return { iv: ivBase64, ciphertext: textoCifrado };
}