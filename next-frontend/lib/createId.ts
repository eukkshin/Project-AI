/**
 * Generate an opaque client-side ID in HTTPS and HTTP environments.
 * crypto.randomUUID() is available only in secure contexts (HTTPS or localhost).
 * crypto.getRandomValues() is available in HTTP contexts as well.
 * This is for temporary UI IDs, NOT for authentication or security tokens.
 */
export function createId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Last-resort UI-only fallback for browsers without Web Crypto.
  return `ui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
