import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Mic, Send, MicOff } from "lucide-react";

interface SweetyInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  language?: "auto" | "en" | "bn";
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

const SweetyInput = ({ onSend, isLoading, language = "auto" }: SweetyInputProps) => {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const getSpeechRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported");
      return null;
    }
    return new SpeechRecognition();
  }, []);

  const startListening = useCallback(() => {
    const recognition = getSpeechRecognition();
    if (!recognition) return;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language === "en" ? "en-US" : language === "bn" ? "bn-BD" : "bn-BD";

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
  }, [getSpeechRecognition, language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const toggleVoice = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
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
      <div className="glass-strong rounded-2xl px-4 py-3 flex items-center gap-3">
        {/* Mic button */}
        <button
          onClick={toggleVoice}
          disabled={isLoading}
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
            isListening
              ? "bg-accent glow-accent"
              : "bg-secondary hover:bg-muted"
          } disabled:opacity-30`}
        >
          <AnimatePresence mode="wait">
            {isListening ? (
              <motion.div key="on" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                  <MicOff className="w-4 h-4 text-white" />
                </motion.div>
              </motion.div>
            ) : (
              <motion.div key="off" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Mic className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Input */}
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? "Thinking..." : isListening ? "🎤 Listening..." : "Ask Sweety anything..."}
          disabled={isLoading}
          rows={1}
          className="flex-1 bg-transparent border-none outline-none resize-none font-display text-sm text-foreground placeholder:text-muted-foreground/60"
        />

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-primary hover:bg-primary/90 transition-all duration-200 disabled:opacity-30 disabled:bg-secondary glow-primary"
        >
          {isLoading ? (
            <motion.div
              className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            <Send className="w-4 h-4 text-primary-foreground" />
          )}
        </button>
      </div>

      {/* Status */}
      {isListening && (
        <motion.p
          className="text-center text-xs text-accent mt-2 font-display"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          🎤 Listening — Tap mic to stop
        </motion.p>
      )}
    </div>
  );
};

export default SweetyInput;
