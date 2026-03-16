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

function speakWithBrowser(text: string): Promise<SpeechSynthesisUtterance> {
  return new Promise((resolve, reject) => {
    const clean = cleanForBrowserSpeech(text);
    if (!clean) { reject(new Error("No text")); return; }
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = /[\u0980-\u09FF]/.test(clean) ? "bn-BD" : "en-US";
    utterance.rate = 1.0;
    utterance.onend = () => resolve(utterance);
    utterance.onerror = (e) => reject(e);
    window.speechSynthesis.speak(utterance);
    resolve(utterance);
  });
}

export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setSpeakingId(null);
  }, []);

  const speak = useCallback(async (text: string, id: string) => {
    if (speakingId === id) { stop(); return; }
    stop();
    setSpeakingId(id);

    try {
      // Use browser TTS (ElevenLabs credits exhausted)
      const utterance = await speakWithBrowser(text);
      utterance.onend = () => setSpeakingId(null);
    } catch {
      console.error("TTS failed");
      setSpeakingId(null);
    }
  }, [speakingId, stop]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (audioRef.current) { audioRef.current.pause(); URL.revokeObjectURL(audioRef.current.src); }
    };
  }, []);

  return { speak, stop, speakingId };
}
