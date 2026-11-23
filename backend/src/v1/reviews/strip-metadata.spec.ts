import { describe, expect, it } from '@jest/globals';
import { stripJpeg, stripPng, stripWebp } from './strip-metadata';

// Small files built byte by byte, so each test shows exactly which parts
// must go (a camera's hidden data) and which must stay (the picture).

const SOI = Buffer.from([0xff, 0xd8]);
const SCAN = Buffer.from([0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0x33, 0xff, 0xd9]);

function jpegSegment(marker: number, text: string) {
  const payload = Buffer.from(text, 'latin1');
  const header = Buffer.from([0xff, marker, 0, 0]);
  header.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([header, payload]);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngChunk(type: string, text = '') {
  const data = Buffer.from(text, 'latin1');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)]);
}

function webpChunk(type: string, data: Buffer) {
  const size = Buffer.alloc(4);
  size.writeUInt32LE(data.length);
  return Buffer.concat([Buffer.from(type, 'latin1'), size, data, Buffer.alloc(data.length % 2)]);
}

function webpFile(...chunks: Buffer[]) {
  const body = Buffer.concat(chunks);
  const header = Buffer.from('RIFF0000WEBP', 'latin1');
  header.writeUInt32LE(body.length + 4, 4);
  return Buffer.concat([header, body]);
}

describe('stripJpeg', () => {
  const jfif = jpegSegment(0xe0, 'JFIF');
  const colour = jpegSegment(0xe2, 'ICC_PROFILE');
  const adobe = jpegSegment(0xee, 'Adobe');

  it('drops Exif, IPTC and comments, and keeps the colour parts and the picture byte for byte', () => {
    const file = Buffer.concat([
      SOI,
      jfif,
      jpegSegment(0xe1, 'Exif GPS 10.72 122.56'),
      colour,
      jpegSegment(0xed, 'IPTC Señor'),
      jpegSegment(0xfe, 'a private comment'),
      adobe,
      SCAN,
    ]);

    const stripped = stripJpeg(file, undefined);

    expect(stripped.equals(Buffer.concat([SOI, jfif, colour, adobe, SCAN]))).toBe(true);
  });

  it('gives a sideways photo a tiny Exif with only its orientation, right after JFIF', () => {
    const file = Buffer.concat([SOI, jfif, jpegSegment(0xe1, 'Exif GPS 10.72 122.56'), SCAN]);

    const stripped = stripJpeg(file, 6);

    const afterJfif = SOI.length + jfif.length;
    expect([stripped[afterJfif], stripped[afterJfif + 1]]).toEqual([0xff, 0xe1]);
    expect(stripped.includes(Buffer.from([0x01, 0x12, 0x00, 0x03, 0, 0, 0, 1, 0x00, 6]))).toBe(true);
    expect(stripped.includes(Buffer.from('GPS', 'latin1'))).toBe(false);
  });

  it('puts the orientation first when the photo has no JFIF', () => {
    const file = Buffer.concat([SOI, colour, SCAN]);

    const stripped = stripJpeg(file, 8);

    expect([stripped[2], stripped[3]]).toEqual([0xff, 0xe1]);
  });

  it('adds no Exif to a photo that is already upright', () => {
    const file = Buffer.concat([SOI, jfif, SCAN]);

    expect(stripJpeg(file, 1).equals(file)).toBe(true);
  });

  it('returns a file it cannot read unchanged', () => {
    const notJpeg = Buffer.from('not a photo');
    const brokenLength = Buffer.concat([SOI, Buffer.from([0xff, 0xe1, 0xff, 0xff, 0x00])]);

    expect(stripJpeg(notJpeg, 6)).toBe(notJpeg);
    expect(stripJpeg(brokenLength, 6)).toBe(brokenLength);
  });
});

describe('stripPng', () => {
  const header = pngChunk('IHDR', 'header-bytes');
  const colour = pngChunk('iCCP', 'colour');
  const picture = pngChunk('IDAT', 'picture');
  const end = pngChunk('IEND');

  it('drops Exif, text notes and the time, and keeps the colour and the picture', () => {
    const file = Buffer.concat([
      PNG_SIGNATURE,
      header,
      pngChunk('eXIf', 'GPS'),
      pngChunk('tEXt', 'Author Niño'),
      colour,
      pngChunk('zTXt', 'note'),
      pngChunk('iTXt', 'note'),
      pngChunk('tIME', 'when'),
      picture,
      end,
    ]);

    const stripped = stripPng(file);

    expect(stripped.equals(Buffer.concat([PNG_SIGNATURE, header, colour, picture, end]))).toBe(true);
  });

  it('drops anything hidden after the end of the picture', () => {
    const file = Buffer.concat([PNG_SIGNATURE, header, picture, end, pngChunk('tEXt', 'hidden')]);

    const stripped = stripPng(file);

    expect(stripped.equals(Buffer.concat([PNG_SIGNATURE, header, picture, end]))).toBe(true);
  });

  it('returns a cut-off file unchanged', () => {
    const whole = Buffer.concat([PNG_SIGNATURE, header, picture]);
    const cutOff = whole.subarray(0, whole.length - 3);

    expect(stripPng(cutOff)).toBe(cutOff);
  });
});

describe('stripWebp', () => {
  // ICC (0x20) + alpha (0x10) + Exif (0x08) + XMP (0x04).
  const extended = () => Buffer.from([0x3c, 0, 0, 0, 9, 0, 0, 9, 0, 0]);
  const picture = webpChunk('VP8 ', Buffer.from('odd', 'latin1'));

  it('drops the Exif and XMP chunks, clears only their flags, and corrects the file size', () => {
    const file = webpFile(
      webpChunk('VP8X', extended()),
      picture,
      webpChunk('EXIF', Buffer.from('GPS 10.72', 'latin1')),
      webpChunk('XMP ', Buffer.from('<xmp/>', 'latin1')),
    );

    const stripped = stripWebp(file);

    const cleared = extended();
    cleared[0] = 0x30;
    expect(stripped.equals(webpFile(webpChunk('VP8X', cleared), picture))).toBe(true);
    expect(stripped.readUInt32LE(4)).toBe(stripped.length - 8);
  });

  it('keeps the padding byte of a chunk with an odd length', () => {
    const file = webpFile(picture);

    expect(stripWebp(file).equals(file)).toBe(true);
  });

  it('returns a file it cannot read unchanged', () => {
    const notWebp = Buffer.from('RIFF0000WAVEdata', 'latin1');
    const claimsTooMuch = Buffer.concat([Buffer.from('RIFF0000WEBPVP8 ', 'latin1'), Buffer.from([0xff, 0xff, 0, 0, 1])]);

    expect(stripWebp(notWebp)).toBe(notWebp);
    expect(stripWebp(claimsTooMuch)).toBe(claimsTooMuch);
  });
});
