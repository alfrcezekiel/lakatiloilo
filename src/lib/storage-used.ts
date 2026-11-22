// The admin Overview's storage line (ticket 167): words and levels for the
// numbers GET /v1/admin/overview answers. Apart from the screen so they can
// be unit-tested (storage-used.test.ts).

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

// "0 KB", "820 KB", "312 MB", "1 GB", "1.2 GB": whole numbers below 1 GB.
export function formatBytes(bytes: number) {
  if (bytes >= GB) {
    const gb = bytes / GB;
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }
  if (bytes >= MB) return `${Math.round(bytes / MB)} MB`;
  return `${Math.round(bytes / KB)} KB`;
}

// From 80 % the team is warned (amber and "Nearly full"), at 100 % uploads
// fail.
export const NEARLY_FULL_PERCENT = 80;

export type StorageLevel = "ok" | "nearly-full" | "full";

// Rounded down, so the number shown never reaches 80 % before the amber
// warning does (code review 2026-11-23: 79.6 % used to read "80 %").
export function storagePercent(used: number, limit: number) {
  return limit > 0 ? Math.min(100, Math.floor((used / limit) * 100)) : 0;
}

export function storageLevel(used: number, limit: number): StorageLevel {
  if (used >= limit) return "full";
  if ((used / limit) * 100 >= NEARLY_FULL_PERCENT) return "nearly-full";
  return "ok";
}
