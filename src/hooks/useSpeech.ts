import { useState, useCallback, useRef, useEffect } from "react";

function cleanForBrowserSpeech(text: string): string {
  return text
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[-*]\s/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

let cachedFemaleVoice: SpeechSynthesisVoice | null = null;

function getFemaleVoice(): SpeechSynthesisVoice | null {
  if (cachedFemaleVoice) return cachedFemaleVoice;
  const voices = window.speechSynthesis.getVoices();
  // Prefer these known female voices
  const preferred = [
    "Google UK English Female",
    "Google US English",
    "Samantha",
    "Karen",
    "Moira",
    "Tessa",
    "Victoria",
    "Zira",
    "Microsoft Zira",
  ];
  for (const name of preferred) {
    const v = voices.find((v) => v.name.includes(name));
    if (v) { cachedFemaleVoice = v; return v; }
  }
  // Fallback: any English female-sounding voice
  const female = voices.find(
    (v) => v.lang.startsWith("en") && /female|woman|zira|samantha|karen|victoria/i.test(v.name)
  );
  if (female) { cachedFemaleVoice = female; return female; }
  // Last resort: first English voice
  const english = voices.find((v) => v.lang.startsWith("en"));
  if (english) { cachedFemaleVoice = english; return english; }
  return null;
}

function speakWithBrowser(text: string): Promise<SpeechSynthesisUtterance> {
  return new Promise((resolve, reject) => {
    const clean = cleanForBrowserSpeech(text);
    if (!clean) { reject(new Error("No text")); return; }
    const utterance = new SpeechSynthesisUtterance(clean);
    
    const femaleVoice = getFemaleVoice();
    if (femaleVoice) utterance.voice = femaleVoice;
    
    utterance.lang = /[\u0980-\u09FF]/.test(clean) ? "bn-BD" : "en-US";
    utterance.rate = 1.0;
    utterance.pitch = 1.1; // Slightly higher pitch for feminine tone
    utterance.onend = () => resolve(utterance);
    utterance.onerror = (e) => reject(e);
    window.speechSynthesis.speak(utterance);
    resolve(utterance);
  });
}

// Load voices early
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedFemaleVoice = null;
    getFemaleVoice();
  };
}

export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [muted, setMuted] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sweety-muted") === "true";
    }
    return false;
  });

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem("sweety-muted", String(next));
      if (next) window.speechSynthesis.cancel();
      return next;
    });
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  const speak = useCallback(async (text: string, id: string) => {
    if (muted) return;
    if (speakingId === id) { stop(); return; }
    stop();
    setSpeakingId(id);

    try {
      const utterance = await speakWithBrowser(text);
      utterance.onend = () => setSpeakingId(null);
    } catch {
      console.error("TTS failed");
      setSpeakingId(null);
    }
  }, [speakingId, stop, muted]);

  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  return { speak, stop, speakingId, muted, toggleMute };
}
