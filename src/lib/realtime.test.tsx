import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTableChanges } from "./realtime";

// Ticket 158: the Supabase browser code is no longer part of the page's
// first scripts. useTableChanges downloads it on demand, after the page is
// on screen. These tests check the doorbell still works with that delay,
// and that leaving a page early never leaves a channel open.
//
// A pretend Supabase client: never a real one (testing rules).
const fake = vi.hoisted(() => {
  const handlers: Array<() => void> = [];
  const channel = {
    on: vi.fn((_type: string, _spec: unknown, handler: () => void) => {
      handlers.push(handler);
      return channel;
    }),
    subscribe: vi.fn(),
  };
  const client = { channel: vi.fn(() => channel), removeChannel: vi.fn() };
  return { handlers, channel, client, createClient: vi.fn(() => client) };
});
vi.mock("@/lib/supabase/client", () => ({ createClient: fake.createClient }));

describe("useTableChanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.handlers.length = 0;
  });

  it("listens to each table once the Supabase code has arrived, and rings on a change", async () => {
    const onChange = vi.fn();

    renderHook(() => useTableChanges(["destinations", "reviews"], onChange, { quietMs: 0 }));

    await waitFor(() => expect(fake.channel.subscribe).toHaveBeenCalledTimes(1));
    expect(fake.channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "destinations" },
      expect.any(Function),
    );
    expect(fake.channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "reviews" },
      expect.any(Function),
    );
    fake.handlers[0]();
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
  });

  it("closes its channel when the traveler leaves the page", async () => {
    const { unmount } = renderHook(() => useTableChanges(["reviews"], vi.fn()));
    await waitFor(() => expect(fake.channel.subscribe).toHaveBeenCalled());

    unmount();

    expect(fake.client.removeChannel).toHaveBeenCalledWith(fake.channel);
  });

  it("opens nothing when the page is left before the Supabase code arrives", async () => {
    const { unmount } = renderHook(() => useTableChanges(["reviews"], vi.fn()));

    unmount();
    // Wait for the same download the hook started (it finishes first).
    await import("@/lib/supabase/client");

    expect(fake.createClient).not.toHaveBeenCalled();
    expect(fake.channel.subscribe).not.toHaveBeenCalled();
  });
});
