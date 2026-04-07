import { useState, useCallback, useRef, useEffect } from "react";

interface UseWakeWordOptions {
  onCommand: (text: string) => void;
  enabled: boolean;
}

export function useWakeWord({ onCommand, enabled }: UseWakeWordOptions) {
  const [listening, setListening] = useState(false);
  const [wakeDetected, setWakeDetected] = useState(false);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const getSpeechRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;
    return new SR();
  }, []);

  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setListening(false);
    setWakeDetected(false);
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) return;
    const recognition = getSpeechRecognition();
    if (!recognition) return;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        
        // Check for wake word "sweety" in any result
        if (transcript.includes("sweety") || transcript.includes("sweetie") || transcript.includes("sweet e")) {
          if (event.results[i].isFinal) {
            // Extract the command after the wake word
            const fullText = event.results[i][0].transcript.trim();
            // Remove wake word patterns
            const command = fullText
              .replace(/^(hey|hi|hello|ok|okay|yo)?\s*(sweety|sweetie|sweet e)/i, "")
              .trim();
            
            if (command.length > 2) {
              setWakeDetected(true);
              onCommand(command);
              // Brief pause then reset
              setTimeout(() => setWakeDetected(false), 2000);
            } else {
              // Just the wake word, wait for more
              setWakeDetected(true);
              setTimeout(() => setWakeDetected(false), 3000);
            }
          } else {
            setWakeDetected(true);
          }
        }
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      // Auto-restart if still enabled
      if (enabled) {
        restartTimeoutRef.current = setTimeout(() => {
          startListening();
        }, 300);
      }
    };

    recognition.onerror = (event: any) => {
      recognitionRef.current = null;
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-available") {
        return; // Don't restart on permission errors
      }
      // Auto-restart on other errors
      if (enabled) {
        restartTimeoutRef.current = setTimeout(() => {
          startListening();
        }, 1000);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
    }
  }, [getSpeechRecognition, onCommand, enabled]);

  useEffect(() => {
    if (enabled) {
      startListening();
    } else {
      stopListening();
    }
    return () => stopListening();
  }, [enabled]);

  return { listening, wakeDetected };
}
