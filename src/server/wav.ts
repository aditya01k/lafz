/**
 * The browser sends 16 kHz mono 16-bit PCM WAV (src/lib/audio.ts writes it), so
 * slicing is byte arithmetic on a fixed 44-byte header.
 */
export const RATE = 16000;
const HEADER = 44;

export function wavDuration(wav: Uint8Array): number {
  return (wav.byteLength - HEADER) / 2 / RATE;
}

export function sliceWav(wav: Uint8Array, startSec: number, endSec: number): Uint8Array {
  const total = (wav.byteLength - HEADER) / 2;
  const a = Math.max(0, Math.floor(startSec * RATE));
  const b = Math.min(total, Math.ceil(endSec * RATE));
  const pcm = wav.subarray(HEADER + a * 2, HEADER + b * 2);
  return encodeWav(pcm);
}

export function encodeWav(pcm: Uint8Array): Uint8Array {
  const out = new Uint8Array(HEADER + pcm.byteLength);
  const v = new DataView(out.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + pcm.byteLength, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, RATE, true);
  v.setUint32(28, RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, pcm.byteLength, true);
  out.set(pcm, HEADER);
  return out;
}
