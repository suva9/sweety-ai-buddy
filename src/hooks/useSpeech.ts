import { useState, useCallback, useRef, useEffect } from "react";

export function useSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setSpeakingId(null);
  }, []);

  const speak = useCallback(async (text: string, id: string) => {
    // If already speaking this message, toggle off
    if (speakingId === id) {
      stop();
      return;
    }
    // Stop any current playback
    stop();

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
  }, [speakingId, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  return { speak, stop, speakingId };
}
