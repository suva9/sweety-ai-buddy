import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface SweetyInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
}

const SweetyInput = ({ onSend, isLoading }: SweetyInputProps) => {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
        animate={{ opacity: isLoading ? [0.3, 1, 0.3] : 0.6 }}
        transition={isLoading ? { duration: 1, repeat: Infinity } : {}}
      />
      <div className="relative">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? "SWEETY is thinking..." : "Command Sweety..."}
          disabled={isLoading}
          rows={1}
          className="w-full bg-transparent border-none outline-none resize-none font-mono text-sm text-foreground placeholder:text-muted-foreground/50 placeholder:tracking-widest placeholder:uppercase caret-primary"
          style={{ caretColor: "hsl(42, 65%, 60%)" }}
        />
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
          ENTER to send · SHIFT+ENTER for new line
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
