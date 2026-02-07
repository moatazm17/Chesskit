import { Move } from "chess.js";

type Sound = "move" | "capture" | "illegalMove";
const soundUrls: Record<Sound, string> = {
  move: "/sounds/move.mp3",
  capture: "/sounds/capture.mp3",
  illegalMove: "/sounds/error.mp3",
};

// Pre-create audio elements for instant playback
const audioElements = new Map<Sound, HTMLAudioElement>();

const getAudio = (sound: Sound): HTMLAudioElement => {
  let audio = audioElements.get(sound);
  if (!audio) {
    audio = new Audio(soundUrls[sound]);
    audio.volume = 0.3;
    audio.preload = "auto";
    audioElements.set(sound, audio);
  }
  return audio;
};

// Preload all sounds on first user interaction
let preloaded = false;
const preloadSounds = () => {
  if (preloaded) return;
  preloaded = true;
  (Object.keys(soundUrls) as Sound[]).forEach((sound) => {
    const audio = getAudio(sound);
    // Force load
    audio.load();
  });
};

if (typeof window !== "undefined") {
  // Preload on first touch/click
  const handler = () => {
    preloadSounds();
    window.removeEventListener("touchstart", handler);
    window.removeEventListener("click", handler);
  };
  window.addEventListener("touchstart", handler, { once: true });
  window.addEventListener("click", handler, { once: true });
}

export const play = async (sound: Sound) => {
  try {
    const audio = getAudio(sound);
    // Reset to start if already playing
    audio.currentTime = 0;
    await audio.play();
  } catch {
    // If play fails, try creating a fresh element
    try {
      audioElements.delete(sound);
      const freshAudio = getAudio(sound);
      freshAudio.currentTime = 0;
      await freshAudio.play();
    } catch {
      // Silently fail - sound is non-critical
    }
  }
};

export const playCaptureSound = () => play("capture");
export const playIllegalMoveSound = () => play("illegalMove");
export const playMoveSound = () => play("move");

export const playSoundFromMove = (move: Move | null) => {
  if (!move) return playIllegalMoveSound();
  if (move.captured) return playCaptureSound();
  return playMoveSound();
};
