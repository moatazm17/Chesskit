import { Move } from "chess.js";

let audioContext: AudioContext | null = null;
let timeout: NodeJS.Timeout | null = null;
const soundsCache = new Map<string, AudioBuffer>();

type Sound = "move" | "capture" | "illegalMove";
const soundUrls: Record<Sound, string> = {
  move: "/sounds/move.mp3",
  capture: "/sounds/capture.mp3",
  illegalMove: "/sounds/error.mp3",
};

const getAudioContext = async (): Promise<AudioContext> => {
  // If context is closed or missing, create a new one
  if (!audioContext || audioContext.state === "closed") {
    soundsCache.clear(); // Buffers are tied to the old context
    audioContext = new AudioContext();
  }

  // Resume if suspended (happens after ads / app background)
  if (audioContext.state === "suspended") {
    try {
      await audioContext.resume();
    } catch {
      // If resume fails, recreate the context
      soundsCache.clear();
      audioContext = new AudioContext();
    }
  }

  return audioContext;
};

export const play = async (sound: Sound) => {
  if (timeout) clearTimeout(timeout);

  timeout = setTimeout(async () => {
    try {
      const ctx = await getAudioContext();

      let audioBuffer = soundsCache.get(soundUrls[sound]);
      if (!audioBuffer) {
        const res = await fetch(soundUrls[sound]);
        const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
        audioBuffer = buffer;
        soundsCache.set(soundUrls[sound], buffer);
      }

      const audioSrc = ctx.createBufferSource();
      audioSrc.buffer = audioBuffer;
      const volume = ctx.createGain();
      volume.gain.value = 0.3;
      audioSrc.connect(volume);
      volume.connect(ctx.destination);
      audioSrc.start();
    } catch {
      // If anything fails, reset context for next attempt
      audioContext = null;
      soundsCache.clear();
    }
  }, 1);
};

export const playCaptureSound = () => play("capture");
export const playIllegalMoveSound = () => play("illegalMove");
export const playMoveSound = () => play("move");

export const playSoundFromMove = (move: Move | null) => {
  if (!move) return playIllegalMoveSound();
  if (move.captured) return playCaptureSound();
  return playMoveSound();
};
