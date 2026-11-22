import { describe, expect, it } from "vitest";
import { checkVideo, MAX_VIDEO_BYTES, newVideoPath, userIdFromToken, VIDEO_MESSAGE, videoTypeOf } from "./review-video";

const file = (name: string, type: string, size = 1024) => new File([new Uint8Array(size)], name, { type });
// A pretend length reader, so no real video is needed.
const lasting = (seconds: number | null) => async () => seconds;

describe("videoTypeOf", () => {
  it("knows MP4, MOV and WebM, and a .mov the browser left nameless", () => {
    expect(videoTypeOf(file("a.mp4", "video/mp4"))).toBe("video/mp4");
    expect(videoTypeOf(file("a.mov", "video/quicktime"))).toBe("video/quicktime");
    expect(videoTypeOf(file("a.webm", "video/webm"))).toBe("video/webm");
    expect(videoTypeOf(file("IMG_0001.MOV", ""))).toBe("video/quicktime");
  });

  it("refuses other kinds of file", () => {
    expect(videoTypeOf(file("a.avi", "video/x-msvideo"))).toBeNull();
    expect(videoTypeOf(file("a.gif", "image/gif"))).toBeNull();
    expect(videoTypeOf(file("notes", ""))).toBeNull();
  });
});

describe("checkVideo", () => {
  it("accepts an MP4 up to 50 MB and 60 seconds", async () => {
    expect(await checkVideo(file("a.mp4", "video/mp4", MAX_VIDEO_BYTES), lasting(60))).toBeNull();
  });

  it("refuses a video over 50 MB, over 60 seconds, or of another type, with the usual message", async () => {
    expect(await checkVideo(file("a.mp4", "video/mp4", MAX_VIDEO_BYTES + 1), lasting(10))).toBe(VIDEO_MESSAGE);
    expect(await checkVideo(file("a.mp4", "video/mp4"), lasting(61))).toBe(VIDEO_MESSAGE);
    expect(await checkVideo(file("a.avi", "video/x-msvideo"), lasting(5))).toBe(VIDEO_MESSAGE);
  });

  it("lets a video through when this browser can't read its length (the backend still checks type and size)", async () => {
    expect(await checkVideo(file("a.mov", "video/quicktime"), lasting(null))).toBeNull();
  });
});

describe("userIdFromToken and newVideoPath", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const token = `x.${btoa(JSON.stringify({ sub: id })).replace(/=+$/, "")}.y`;

  it("reads the traveler's id from their own login token", () => {
    expect(userIdFromToken(token)).toBe(id);
    expect(userIdFromToken("not-a-token")).toBeNull();
  });

  it("puts the video in the traveler's own folder under a random name with the right ending", () => {
    expect(newVideoPath(id, file("IMG_0001.MOV", "video/quicktime"))).toMatch(
      new RegExp(`^${id}/[0-9a-f-]{36}\\.mov$`),
    );
  });
});
