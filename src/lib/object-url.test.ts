import { renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useObjectUrl, useObjectUrls } from "./object-url";

// The temporary preview address of a chosen photo or video. The browser's
// own create and free functions are pretend, so the test can see which
// addresses were freed and when.

const file = (name: string) => new File(["x"], name, { type: "video/mp4" });
const revoke = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  revoke.mockClear();
  URL.createObjectURL = vi.fn((chosen: Blob) => `blob:${(chosen as File).name}`);
  URL.revokeObjectURL = revoke;
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("useObjectUrl", () => {
  it("gives no address when no file is chosen", () => {
    const { result } = renderHook(() => useObjectUrl(null));

    expect(result.current).toBeNull();
  });

  it("keeps the address alive through React's development double mount", () => {
    const chosen = file("strict.mp4");

    const { result } = renderHook(() => useObjectUrl(chosen), { wrapper: StrictMode });
    vi.advanceTimersByTime(5000);

    expect(result.current).toBe("blob:strict.mp4");
    expect(revoke).not.toHaveBeenCalled();
  });

  it("frees the address a moment after the preview goes away, not before", () => {
    const chosen = file("gone.mp4");
    const { unmount } = renderHook(() => useObjectUrl(chosen));

    unmount();
    vi.advanceTimersByTime(999);
    expect(revoke).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:gone.mp4");
  });

  it("frees the old address and keeps the new one when the file changes", () => {
    const first = file("first.mp4");
    const second = file("second.mp4");
    const { result, rerender } = renderHook(({ chosen }) => useObjectUrl(chosen), {
      initialProps: { chosen: first },
    });

    rerender({ chosen: second });
    vi.advanceTimersByTime(1000);

    expect(result.current).toBe("blob:second.mp4");
    expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:first.mp4");
  });
});

describe("useObjectUrls", () => {
  it("gives the addresses in the same order as the files", () => {
    const files = [file("uno.jpg"), file("duha.jpg"), file("tatlo.jpg")];

    const { result } = renderHook(() => useObjectUrls(files));

    expect(result.current).toEqual(["blob:uno.jpg", "blob:duha.jpg", "blob:tatlo.jpg"]);
  });

  it("frees every address a moment after the previews go away", () => {
    const files = [file("isa.jpg"), file("duwa.jpg")];
    const { unmount } = renderHook(() => useObjectUrls(files));

    unmount();
    vi.advanceTimersByTime(1000);

    expect(revoke.mock.calls.flat().sort()).toEqual(["blob:duwa.jpg", "blob:isa.jpg"]);
  });
});
