

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);
export const MAX_IMAGE_BYTES = 4.3 * 1024 * 1024;

const MAGIC: Array<{ mime: string; bytes: number[] }> = [
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
];

/** Sniff actual content type from magic bytes; never trust the client mime. */
export function sniffImageMime(bytes: Uint8Array): string | null {
  for (const m of MAGIC) {
    if (m.bytes.every((b, i) => bytes[i] === b)) return m.mime;
  }
  return null;
}
