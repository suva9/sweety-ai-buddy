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
    .replace(/\s+/g, " ")
    .trim();
}

let cachedFemaleVoice: SpeechSynthesisVoice | null = null;

function getFemaleVoice(): SpeechSynthesisVoice | null {
  if (cachedFemaleVoice) return cachedFemaleVoice;

  const voices = window.speechSynthesis.getVoices();
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
    const voice = voices.find((item) => item.name.includes(name));
    if (voice) {
      cachedFemaleVoice = voice;
      return voice;
    }
  }

  const fallbackFemale = voices.find(
    (item) => item.lang.startsWith("en") && /female|woman|zira|samantha|karen|victoria/i.test(item.name),
  );
  if (fallbackFemale) {
    cachedFemaleVoice = fallbackFemale;
    return fallbackFemale;
  }

  const englishVoice = voices.find((item) => item.lang.startsWith("en"));
  if (englishVoice) {
    cachedFemaleVoice = englishVoice;
    return englishVoice;
  }

  return null;
}

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

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speakingIdRef = useRef<string | null>(null);
  const mutedRef = useRef(muted);

  mutedRef.current = muted;
  speakingIdRef.current = speakingId;

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    speakingIdRef.current = null;
    setSpeakingId(null);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem("sweety-muted", String(next));
      if (next) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
        speakingIdRef.current = null;
        setSpeakingId(null);
      }
      return next;
    });
  }, []);

  const speak = useCallback((text: string, id: string) => {
    return new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }

      const cleanText = cleanForBrowserSpeech(text);
      if (!cleanText || mutedRef.current) {
        resolve();
        return;
      }

      if (speakingIdRef.current === id) {
        stop();
        resolve();
        return;
      }

      stop();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const femaleVoice = getFemaleVoice();
      if (femaleVoice) utterance.voice = femaleVoice;

      utterance.lang = /[\u0980-\u09FF]/.test(cleanText) ? "bn-BD" : "en-US";
      utterance.rate = 1;
      utterance.pitch = 1.1;

      utteranceRef.current = utterance;
      speakingIdRef.current = id;
      setSpeakingId(id);

      utterance.onend = () => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null;
          speakingIdRef.current = null;
          setSpeakingId(null);
        }
        resolve();
      };

      utterance.onerror = (event) => {
        if (utteranceRef.current === utterance) {
          utteranceRef.current = null;
          speakingIdRef.current = null;
          setSpeakingId(null);
        }
        reject(event);
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        utteranceRef.current = null;
        speakingIdRef.current = null;
        setSpeakingId(null);
        reject(error);
      }
    });
  }, [stop]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { speak, stop, speakingId, muted, toggleMute };
}
