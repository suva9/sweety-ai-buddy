import { useState, useRef, useEffect, useCallback } from "react";

interface UseWakeWordOptions {
  onCommand: (text: string) => void;
  enabled: boolean;
  paused?: boolean;
}

const WAKE_WORD_REGEX = /\b(sweety|sweetie|sweet e|sweetly|suite e|sweaty)\b/i;
const CAPTURE_DELAY_MS = 1200;
const RESTART_DELAY_MS = 350;

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function stripWakeWord(text: string) {
  return normalizeText(text.replace(/^.*?\b(sweety|sweetie|sweet e|sweetly|suite e|sweaty)\b[,.!?]?\s*/i, ""));
}

function mergeSegments(current: string, next: string) {
  if (!next) return current;
  if (!current) return next;

  const currentLower = current.toLowerCase();
  const nextLower = next.toLowerCase();

  if (currentLower === nextLower) return current;
  if (nextLower.startsWith(currentLower)) return next;
  if (currentLower.endsWith(nextLower)) return current;

  return `${current} ${next}`.replace(/\s+/g, " ").trim();
}

export function useWakeWord({ onCommand, enabled, paused = false }: UseWakeWordOptions) {
  const [listening, setListening] = useState(false);
  const [wakeDetected, setWakeDetected] = useState(false);

  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(enabled);
  const pausedRef = useRef(paused);
  const onCommandRef = useRef(onCommand);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const submitTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const detectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const captureModeRef = useRef(false);
  const commandBufferRef = useRef("");
  const intentionalStopRef = useRef(false);
  const lastSubmittedRef = useRef({ text: "", at: 0 });

  enabledRef.current = enabled;
  pausedRef.current = paused;
  onCommandRef.current = onCommand;

  const clearTimers = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    restartTimerRef.current = undefined;
    submitTimerRef.current = undefined;
    detectTimerRef.current = undefined;
  }, []);

  const resetCapture = useCallback(() => {
    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    captureModeRef.current = false;
    commandBufferRef.current = "";
  }, []);

  const clearWakeIndicator = useCallback((delay = 1500) => {
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    detectTimerRef.current = setTimeout(() => setWakeDetected(false), delay);
  }, []);

  const submitCommand = useCallback(() => {
    const text = commandBufferRef.current.replace(/[.!?,]+$/g, "").trim();
    resetCapture();

    if (text.length < 2) {
      clearWakeIndicator(800);
      return;
    }

    const now = Date.now();
    if (lastSubmittedRef.current.text.toLowerCase() === text.toLowerCase() && now - lastSubmittedRef.current.at < 2500) {
      clearWakeIndicator(800);
      return;
    }

    lastSubmittedRef.current = { text, at: now };
    onCommandRef.current(text);
    clearWakeIndicator(1500);
  }, [clearWakeIndicator, resetCapture]);

  const scheduleSubmit = useCallback(() => {
    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    submitTimerRef.current = setTimeout(() => {
      submitCommand();
    }, CAPTURE_DELAY_MS);
  }, [submitCommand]);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    clearTimers();
    resetCapture();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setListening(false);
    setWakeDetected(false);
  }, [clearTimers, resetCapture]);

  const start = useCallback(() => {
    if (recognitionRef.current || !enabledRef.current || pausedRef.current) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    intentionalStopRef.current = false;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (!event.results[i].isFinal) continue;

        const alternatives = Array.from(event.results[i] as SpeechRecognitionResult).map((item: any) => item.transcript.trim());
        const primaryText = normalizeText(alternatives[0] || "");
        const matchedWakeText = alternatives.find((item) => WAKE_WORD_REGEX.test(item)) || "";

        if (matchedWakeText) {
          captureModeRef.current = true;
          setWakeDetected(true);
          const trailingText = stripWakeWord(matchedWakeText);
          if (trailingText) {
            commandBufferRef.current = mergeSegments(commandBufferRef.current, trailingText);
          }
          scheduleSubmit();
          continue;
        }

        if (captureModeRef.current && primaryText) {
          commandBufferRef.current = mergeSegments(commandBufferRef.current, primaryText);
          scheduleSubmit();
        }
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;

      if (captureModeRef.current && commandBufferRef.current.trim()) {
        submitCommand();
      }

      if (enabledRef.current && !pausedRef.current && !intentionalStopRef.current) {
        restartTimerRef.current = setTimeout(() => {
          start();
        }, RESTART_DELAY_MS);
        return;
      }

      setListening(false);
    };

    recognition.onerror = (event: any) => {
      recognitionRef.current = null;

      if (event.error === "not-allowed" || event.error === "service-not-available") {
        setListening(false);
        return;
      }

      if (enabledRef.current && !pausedRef.current && !intentionalStopRef.current) {
        restartTimerRef.current = setTimeout(() => {
          start();
        }, 1000);
        return;
      }

      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
    }
  }, [scheduleSubmit, submitCommand]);

  useEffect(() => {
    if (enabled && !paused) {
      start();
    } else {
      stop();
    }

    return () => {
      stop();
    };
  }, [enabled, paused, start, stop]);

  return { listening, wakeDetected };
}
