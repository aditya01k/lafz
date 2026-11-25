const RATE = 16000;

/**
 * Pulls the soundtrack out of the video in the browser and downmixes it to
 * 16 kHz mono WAV: a 1-minute reel uploads as ~2 MB instead of the whole video.
 */
export async function extractWav(file: File): Promise<{ wav: Blob; duration: number }> {
  const bytes = await file.arrayBuffer();
  const ctx = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(bytes);
  } catch {
    throw new Error("Couldn't read the audio in this video. Try an MP4 or MOV with sound.");
  } finally {
    void ctx.close();
  }
  const length = Math.ceil(decoded.duration * RATE);
  const offline = new OfflineAudioContext(1, length, RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const mono = (await offline.startRendering()).getChannelData(0);
  return { wav: encodeWav(mono), duration: decoded.duration };
}

function encodeWav(samples: Float32Array): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
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
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}
