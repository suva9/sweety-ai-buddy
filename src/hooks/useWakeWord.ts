import { useState, useRef, useEffect, useCallback } from "react";

interface UseWakeWordOptions {
  onCommand: (text: string) => void;
  enabled: boolean;
}

export function useWakeWord({ onCommand, enabled }: UseWakeWordOptions) {
  const [listening, setListening] = useState(false);
  const [wakeDetected, setWakeDetected] = useState(false);
  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(enabled);
  const onCommandRef = useRef(onCommand);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isStoppingRef = useRef(false);

  // Keep refs in sync without causing re-renders/restarts
  enabledRef.current = enabled;
  onCommandRef.current = onCommand;

  const stop = useCallback(() => {
    isStoppingRef.current = true;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = undefined;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setListening(false);
    setWakeDetected(false);
  }, []);

  const start = useCallback(() => {
    // Don't start if already running or intentionally stopped
    if (recognitionRef.current) return;
    isStoppingRef.current = false;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false; // Only final results to avoid false triggers
    recognition.lang = "en-US";
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (!event.results[i].isFinal) continue;

        // Check all alternatives for wake word
        let bestMatch = "";
        for (let alt = 0; alt < event.results[i].length; alt++) {
          const transcript = event.results[i][alt].transcript.toLowerCase().trim();
          if (
            transcript.includes("sweety") ||
            transcript.includes("sweetie") ||
            transcript.includes("sweet e") ||
            transcript.includes("sweetly") ||
            transcript.includes("suite e") ||
            transcript.includes("sweating")
          ) {
            bestMatch = event.results[i][alt].transcript.trim();
            break;
          }
        }

        if (!bestMatch) continue;

        // Extract command: remove everything up to and including the wake word
        const command = bestMatch
          .replace(/^.*?\b(sweety|sweetie|sweet e|sweetly|suite e|sweating)\b[,.]?\s*/i, "")
          .trim();

        if (command.length > 1) {
          setWakeDetected(true);
          onCommandRef.current(command);
          setTimeout(() => setWakeDetected(false), 2000);
        } else {
          // Just wake word alone - show detected briefly
          setWakeDetected(true);
          setTimeout(() => setWakeDetected(false), 3000);
        }
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      // Only auto-restart if we didn't intentionally stop
      if (!isStoppingRef.current && enabledRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (enabledRef.current && !isStoppingRef.current) {
            start();
          }
        }, 500);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Wake word recognition error:", event.error);
      recognitionRef.current = null;
      setListening(false);
      // Don't restart on fatal errors
      if (event.error === "not-allowed" || event.error === "service-not-available") {
        isStoppingRef.current = true;
        return;
      }
      // Restart with longer delay on errors
      if (!isStoppingRef.current && enabledRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (enabledRef.current && !isStoppingRef.current) {
            start();
          }
        }, 2000);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }
    return () => stop();
  }, [enabled, start, stop]);

  return { listening, wakeDetected };
}
