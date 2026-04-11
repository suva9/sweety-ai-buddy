import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Volume2, VolumeX, Copy, Check } from "lucide-react";
import { useState } from "react";

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

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className={`w-full flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl ${
          isUser
            ? "glass px-4 py-3 rounded-br-md"
            : "px-4 py-3"
        }`}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{
              background: "linear-gradient(135deg, hsl(340 80% 50%), hsl(200 100% 55%))"
            }}>
              <span className="text-[8px] font-bold text-white">S</span>
            </div>
            <span className="text-xs font-medium text-primary text-glow">Sweety</span>
            <div className="flex-1" />
            <button onClick={handleCopy} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
            <button onClick={onSpeak} className="p-1 text-muted-foreground hover:text-primary transition-colors">
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-primary" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
        <div className={`text-sm leading-relaxed ${isUser ? "font-display text-foreground" : "font-display text-foreground/90"}`}>
          {isUser ? (
            <span>{content}</span>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none [&_p]:text-foreground/90 [&_strong]:text-primary [&_code]:text-primary [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_li]:text-foreground/90 [&_a]:text-primary">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SweetyMessage;
