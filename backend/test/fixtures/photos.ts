// A real, tiny photo for upload tests: a 1×1 pixel PNG (67 bytes). It is
// a valid PNG, so the photo check passes and only the login is judged.
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
