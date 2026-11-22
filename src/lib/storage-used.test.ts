import { describe, expect, it } from "vitest";
import { formatBytes, storageLevel, storagePercent } from "./storage-used";

const MB = 1024 * 1024;
const GB = 1024 * MB;

describe("formatBytes", () => {
  it("says KB, MB and GB the way the team reads them", () => {
    expect(formatBytes(0)).toBe("0 KB");
    expect(formatBytes(820 * 1024)).toBe("820 KB");
    expect(formatBytes(312 * MB)).toBe("312 MB");
    expect(formatBytes(GB)).toBe("1 GB");
    expect(formatBytes(1.2 * GB)).toBe("1.2 GB");
  });
});

describe("storageLevel", () => {
  it("is fine below 80 %, nearly full from 80 %, full at the limit", () => {
    expect(storageLevel(312 * MB, GB)).toBe("ok");
    expect(storageLevel(0.79 * GB, GB)).toBe("ok");
    expect(storageLevel(0.8 * GB, GB)).toBe("nearly-full");
    expect(storageLevel(GB, GB)).toBe("full");
    expect(storageLevel(1.1 * GB, GB)).toBe("full");
  });
});

describe("storagePercent", () => {
  it("rounds down to a whole percent, so 79.6 % never reads 80 % without the warning, and never goes past 100", () => {
    expect(storagePercent(312 * MB, GB)).toBe(30);
    expect(storagePercent(0.796 * GB, GB)).toBe(79);
    expect(storageLevel(0.796 * GB, GB)).toBe("ok");
    expect(storagePercent(2 * GB, GB)).toBe(100);
  });
});
