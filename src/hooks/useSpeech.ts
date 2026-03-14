import { useState, useCallback, useRef, useEffect } from "react";

function isBengali(text: string): boolean {
  const bengaliChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
  return bengaliChars > text.length * 0.15;
}

function cleanForSpeech(text: string): string {
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

export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    // Stop Typecast audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    // Stop browser speech
    if (utteranceRef.current) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
    setSpeakingId(null);
  }, []);

  const speakBengaliNative = useCallback((text: string, id: string) => {
    const clean = cleanForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean.slice(0, 500));
    utterance.lang = "bn-BD";
    utterance.rate = 1.0;
    utterance.pitch = 1.1;

    // Try to find a Bengali voice
    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find(v => v.lang.startsWith("bn")) || 
                    voices.find(v => v.lang.startsWith("hi")) || // Hindi fallback
                    null;
    if (bnVoice) utterance.voice = bnVoice;

    utteranceRef.current = utterance;
    utterance.onend = () => {
      utteranceRef.current = null;
      setSpeakingId(null);
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setSpeakingId(null);
    };

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  }, []);

  const speakTypecast = useCallback(async (text: string, id: string) => {
    setSpeakingId(id);
    try {
      const ttsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/typecast-tts`;
      const response = await fetch(ttsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.error("TTS failed:", response.status);
        setSpeakingId(null);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setSpeakingId(null);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        setSpeakingId(null);
      };

      await audio.play();
    } catch (e) {
      console.error("TTS error:", e);
      setSpeakingId(null);
    }
  }, []);

  const speak = useCallback(async (text: string, id: string) => {
    if (speakingId === id) {
      stop();
      return;
    }
    stop();

    if (isBengali(text)) {
      speakBengaliNative(text, id);
    } else {
      await speakTypecast(text, id);
    }
  }, [speakingId, stop, speakBengaliNative, speakTypecast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  return { speak, stop, speakingId };
}
