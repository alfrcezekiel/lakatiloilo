import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FILES_SETTLE_MS, useRefreshAfterFiles } from "./refresh-after-files";

// The admin Overview's Storage used must drop after a video is removed, even
// though the database row changes before the file is deleted.

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useRefreshAfterFiles", () => {
  it("refreshes at once, then again after the file has had time to go", () => {
    const refresh = vi.fn();
    const { result } = renderHook(() => useRefreshAfterFiles(refresh));

    result.current();
    expect(refresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(FILES_SETTLE_MS - 1);
    expect(refresh).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("shows the lower number once the later refresh reads Storage after the delete", () => {
    let storedBytes = 40_000_000;
    const shown: number[] = [];
    const { result } = renderHook(() => useRefreshAfterFiles(() => shown.push(storedBytes)));

    result.current();
    storedBytes = 0;
    vi.advanceTimersByTime(FILES_SETTLE_MS);

    expect(shown).toEqual([40_000_000, 0]);
  });

  it("shares one later refresh between rings close together", () => {
    const refresh = vi.fn();
    const { result } = renderHook(() => useRefreshAfterFiles(refresh));

    result.current();
    vi.advanceTimersByTime(1000);
    result.current();
    vi.advanceTimersByTime(FILES_SETTLE_MS);

    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("cancels the later refresh when the admin leaves the page", () => {
    const refresh = vi.fn();
    const { result, unmount } = renderHook(() => useRefreshAfterFiles(refresh));

    result.current();
    unmount();
    vi.advanceTimersByTime(FILES_SETTLE_MS);

    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
