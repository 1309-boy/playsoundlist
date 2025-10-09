// libs/fsb-decoder.js
// Heuristic FSB extractor: finds embedded OGG / WAV / FLAC / MP3 and decodes it.
export async function decodeFsbToAudioBuffer(audioContext, arrayBuffer) {
  const buf = new Uint8Array(arrayBuffer);

  // helper: find first occurrence of byte pattern
  function findBytes(needle) {
    outer: for (let i = 0; i <= buf.length - needle.length; i++) {
      for (let j = 0; j < needle.length; j++) {
        if (buf[i + j] !== needle[j]) continue outer;
      }
      return i;
    }
    return -1;
  }

  function enc(str) {
    return new TextEncoder().encode(str);
  }

  // 1) OGG
  let start = findBytes(enc("OggS"));
  if (start >= 0) {
    const slice = arrayBuffer.slice(start); // until EOF
    return decodeAudioDataP(audioContext, slice, "audio/ogg");
  }

  // 2) WAV (RIFF…WAVE)
  start = findBytes(enc("RIFF"));
  if (start >= 0) {
    // sanity: must also contain "WAVE" shortly after
    const waveAt = findBytes(enc("WAVE"));
    if (waveAt >= 0 && waveAt > start && waveAt - start < 128) {
      const slice = arrayBuffer.slice(start);
      return decodeAudioDataP(audioContext, slice, "audio/wav");
    }
  }

  // 3) FLAC
  start = findBytes(enc("fLaC"));
  if (start >= 0) {
    const slice = arrayBuffer.slice(start);
    return decodeAudioDataP(audioContext, slice, "audio/flac");
  }

  // 4) MP3 frame sync (very heuristic)
  start = -1;
  for (let i = 0; i < buf.length - 1; i++) {
    // 0xFFEx or 0xFFFB-ish
    if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
      start = i;
      break;
    }
  }
  if (start >= 0) {
    const slice = arrayBuffer.slice(start);
    return decodeAudioDataP(audioContext, slice, "audio/mpeg");
  }

  // Nothing found
  throw new Error("Unsupported FSB contents (no embedded OGG/WAV/FLAC/MP3 found).");
}

function decodeAudioDataP(ctx, arrBuf /*, mimeHint */) {
  // Safari 호환 Promise 래퍼
  return new Promise((resolve, reject) => {
    try {
      // modern browsers
      const p = ctx.decodeAudioData(arrBuf, resolve, reject);
      // Chrome returns a promise when callbacks omitted (but we passed callbacks).
      // This keeps it compatible across browsers.
      if (p && typeof p.then === "function") {
        p.then(resolve, reject);
      }
    } catch (e) {
      reject(e);
    }
  });
}
