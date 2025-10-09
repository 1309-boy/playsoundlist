// libs/fsb-decoder.js
// Heuristic FSB extractor: try to find an embedded OGG / WAV(RIFF) / FLAC / MP3
// and decode it to an AudioBuffer via WebAudio's decodeAudioData.
// 이 코드는 모든 FSB를 100% 지원하진 않지만, OGG/MP3/FLAC/RIFF가 내장된 다수 샘플을 재생할 수 있습니다.

export async function decodeFsbToAudioBuffer(audioContext, arrayBuffer) {
  const u8 = new Uint8Array(arrayBuffer);
  const enc = (s) => new TextEncoder().encode(s);

  // ---- helpers -------------------------------------------------
  const sigs = {
    OGG: enc("OggS"),
    RIFF: enc("RIFF"),
    WAVE: enc("WAVE"),
    FLAC: enc("fLaC"),
    ID3: enc("ID3"),
  };

  function indexOf(hay, needle, from = 0) {
    outer: for (let i = from; i <= hay.length - needle.length; i++) {
      for (let j = 0; j < needle.length; j++) {
        if (hay[i + j] !== needle[j]) continue outer;
      }
      return i;
    }
    return -1;
  }

  function sliceToNextHeader(startIdx) {
    // 다음 오디오 헤더 위치까지 자름(없으면 끝까지)
    const candidates = [
      sigs.OGG, sigs.RIFF, sigs.FLAC, sigs.ID3,
      // MP3 프레임 헤더는 바이트 패턴으로만 찾음: 0xFFEx/0xFFFB 등
    ];
    let next = u8.length;
    for (const pat of candidates) {
      const pos = indexOf(u8, pat, startIdx + 4);
      if (pos !== -1) next = Math.min(next, pos);
    }
    // MP3 프레임 헤더 대충 탐색
    for (let i = startIdx + 2; i < u8.length - 1; i++) {
      if (u8[i] === 0xff && (u8[i + 1] & 0xe0) === 0xe0) {
        next = Math.min(next, i);
        break;
      }
    }
    return arrayBuffer.slice(startIdx, next);
  }

  function decodeAudioDataP(ctx, buf) {
    return new Promise((resolve, reject) => {
      try {
        // callbacks + promise 모두 대응
        const p = ctx.decodeAudioData(buf, resolve, reject);
        if (p && typeof p.then === "function") p.then(resolve, reject);
      } catch (e) { reject(e); }
    });
  }

  // ---- 1) OGG --------------------------------------------------
  let off = indexOf(u8, sigs.OGG);
  if (off >= 0) {
    const chunk = sliceToNextHeader(off);
    try { return await decodeAudioDataP(audioContext, chunk); } catch {}
  }

  // ---- 2) WAV (RIFF..WAVE) ------------------------------------
  off = indexOf(u8, sigs.RIFF);
  if (off >= 0) {
    const waveAt = indexOf(u8, sigs.WAVE, off + 4);
    if (waveAt > off && waveAt - off < 128) {
      const chunk = sliceToNextHeader(off);
      try { return await decodeAudioDataP(audioContext, chunk); } catch {}
    }
  }

  // ---- 3) FLAC -------------------------------------------------
  off = indexOf(u8, sigs.FLAC);
  if (off >= 0) {
    const chunk = sliceToNextHeader(off);
    try { return await decodeAudioDataP(audioContext, chunk); } catch {}
  }

  // ---- 4) MP3 (frame sync) ------------------------------------
  let mp3Start = -1;
  for (let i = 0; i < u8.length - 1; i++) {
    if (u8[i] === 0xff && (u8[i + 1] & 0xe0) === 0xe0) { mp3Start = i; break; }
  }
  if (mp3Start >= 0) {
    const chunk = sliceToNextHeader(mp3Start);
    try { return await decodeAudioDataP(audioContext, chunk); } catch {}
  }

  // ---- 실패: 안내 메시지 ---------------------------------------
  throw new Error(
    "Unsupported FSB contents: couldn't find embedded OGG/WAV/FLAC/MP3.\n" +
    "일부 FSB는 XMA/ADPCM 등 브라우저 미지원 코덱을 사용합니다. " +
    "이 경우 서버/액션에서 WAV로 변환해 올려야 재생됩니다."
  );
}
