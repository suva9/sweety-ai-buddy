import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Volume2, VolumeX, Copy, Check, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";

interface SweetyMessageProps {
  role: "user" | "assistant";
  content: string;
  index: number;
  isSpeaking?: boolean;
  onSpeak?: () => void;
}

const SweetyMessage = ({ role, content, index, isSpeaking, onSpeak }: SweetyMessageProps) => {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const [showContent, setShowContent] = useState(isUser);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isUser && !showContent) {
      const t = setTimeout(() => setShowContent(true), 150);
      return () => clearTimeout(t);
    }
  }, [isUser, showContent]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 40, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="w-full flex justify-end"
      >
        <div className="max-w-[80%] rounded-2xl rounded-br-sm glass-strong px-4 py-3 border border-white/10">
          <span className="text-sm font-display text-foreground">{content}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -30, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="w-full flex justify-start"
    >
      <div className="max-w-[88%] rounded-2xl rounded-bl-sm px-4 py-3 relative overflow-hidden">
        {/* Subtle glow behind assistant messages */}
        <motion.div
          className="absolute inset-0 rounded-2xl opacity-[0.03] pointer-events-none"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(200 100% 55%))",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.03 }}
          transition={{ duration: 0.8 }}
        />

        {/* Header */}
        <div className="flex items-center gap-2 mb-2 relative z-10">
          <motion.div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(340 80% 50%), hsl(200 100% 55%))",
            }}
            animate={isSpeaking ? { scale: [1, 1.2, 1], boxShadow: ["0 0 0px hsl(340 80% 50%)", "0 0 12px hsl(340 80% 50%)", "0 0 0px hsl(340 80% 50%)"] } : {}}
            transition={{ duration: 0.8, repeat: isSpeaking ? Infinity : 0 }}
          >
            <Sparkles className="w-2.5 h-2.5 text-white" />
          </motion.div>
          <span className="text-xs font-medium text-primary text-glow font-display">Sweety</span>
          <div className="flex-1" />
          <motion.button
            onClick={handleCopy}
            whileTap={{ scale: 0.85 }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </motion.button>
          <motion.button
            onClick={onSpeak}
            whileTap={{ scale: 0.85 }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-white/5 transition-all"
          >
            {isSpeaking ? (
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5, repeat: Infinity }}>
                <VolumeX className="w-3.5 h-3.5 text-primary" />
              </motion.div>
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </motion.button>
        </div>

        {/* Content with reveal animation */}
        <div ref={contentRef} className="relative z-10">
          {showContent ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="text-sm leading-relaxed font-display"
            >
              <div className="prose prose-invert prose-sm max-w-none [&_p]:text-foreground/90 [&_strong]:text-primary [&_code]:text-primary [&_code]:bg-secondary/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-xs [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_h3]:text-sm [&_li]:text-foreground/90 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-primary/50 [&_blockquote]:text-foreground/70 [&_hr]:border-white/10 [&_pre]:bg-secondary/50 [&_pre]:border [&_pre]:border-white/5 [&_pre]:rounded-xl">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="flex items-center gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary/60"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SweetyMessage;
