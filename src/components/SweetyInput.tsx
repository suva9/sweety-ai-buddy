import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface SweetyInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

// Extend Window for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

const SweetyInput = ({ onSend, isLoading }: SweetyInputProps) => {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const getSpeechRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser");
      return null;
    }
    return new SpeechRecognition();
  }, []);

  const startListening = useCallback(() => {
    const recognition = getSpeechRecognition();
    if (!recognition) return;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "bn-BD"; // Bengali primary, also picks up English

    let finalTranscript = "";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interim = transcript;
        }
      }
      setInput(finalTranscript + interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (finalTranscript.trim()) {
        setInput(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      recognitionRef.current = null;
      if (event.error !== "aborted") {
        toast.error(`Voice error: ${event.error}`);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [getSpeechRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const toggleVoice = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full">
      <motion.div
        className="h-[1px] bg-primary mb-4"
        animate={{
          opacity: isListening ? [0.3, 1, 0.3] : isLoading ? [0.3, 1, 0.3] : 0.6,
        }}
        transition={
          isListening || isLoading ? { duration: 0.6, repeat: Infinity } : {}
        }
      />
      <div className="relative flex items-center gap-3">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isLoading
              ? "SWEETY is thinking..."
              : isListening
              ? "Listening..."
              : "Command Sweety..."
          }
          disabled={isLoading}
          rows={1}
          className="flex-1 bg-transparent border-none outline-none resize-none font-mono text-sm text-foreground placeholder:text-muted-foreground/50 placeholder:tracking-widest placeholder:uppercase caret-primary"
          style={{ caretColor: "hsl(42, 65%, 60%)" }}
        />
        {/* Voice button */}
        <button
          onClick={toggleVoice}
          disabled={isLoading}
          className="relative flex-shrink-0 w-8 h-8 flex items-center justify-center border border-border hover:border-primary transition-colors duration-200 disabled:opacity-30"
          title={isListening ? "Stop listening" : "Voice input"}
        >
          <AnimatePresence mode="wait">
            {isListening ? (
              <motion.div
                key="listening"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center justify-center"
              >
                {/* Pulsing dot when listening */}
                <motion.div
                  className="w-3 h-3 bg-primary"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="mic"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center justify-center"
              >
                {/* Mic glyph - simple geometric shape */}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="text-muted-foreground"
                >
                  <rect x="5" y="1" width="4" height="8" fill="currentColor" />
                  <path
                    d="M3 6v1a4 4 0 0 0 8 0V6"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    fill="none"
                  />
                  <line
                    x1="7"
                    y1="11"
                    x2="7"
                    y2="13"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <line
                    x1="5"
                    y1="13"
                    x2="9"
                    y2="13"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
          {isListening ? (
            <motion.span
              className="text-primary glow-gold"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              LISTENING — TAP TO STOP
            </motion.span>
          ) : (
            "ENTER to send · MIC for voice"
          )}
        </span>
        {isLoading && (
          <motion.span
            className="font-mono text-[10px] text-primary tracking-widest uppercase glow-gold"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            PROCESSING
          </motion.span>
        )}
      </div>
    </div>
  );
};

export default SweetyInput;
