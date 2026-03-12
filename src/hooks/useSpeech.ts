import { useState, useCallback, useEffect } from "react";

export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeakingId(null);
  }, []);

  const speak = useCallback((text: string, id: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    // If already speaking this message, stop it
    if (synth.speaking) {
      synth.cancel();
      setSpeakingId(null);
      // If toggling same message off, just return
      if (speakingId === id) return;
    }

    // Strip markdown for cleaner speech
    const clean = text
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[-*]\s/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.lang = /[\u0980-\u09FF]/.test(clean) ? "bn-BD" : "en-US";

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    synth.speak(utterance);
  }, [speakingId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  return { speak, stop, speakingId };
}
