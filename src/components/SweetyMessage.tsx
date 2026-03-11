import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface SweetyMessageProps {
  role: "user" | "assistant";
  content: string;
  index: number;
}

const SweetyMessage = ({ role, content, index }: SweetyMessageProps) => {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className={`w-full ${isUser ? "flex justify-end" : ""}`}
    >
      <div
        className={`max-w-[85%] ${
          isUser
            ? "border border-border bg-secondary px-4 py-3"
            : "px-4 py-3"
        }`}
      >
        {!isUser && (
          <div className="text-primary font-mono text-xs tracking-widest uppercase mb-2 glow-gold">
            SWEETY
          </div>
        )}
        <div
          className={`text-sm leading-relaxed ${
            isUser ? "font-mono text-foreground" : "font-sans text-foreground/90"
          }`}
        >
          {isUser ? (
            <span>{content}</span>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none [&_p]:text-foreground/90 [&_strong]:text-primary [&_code]:text-primary [&_code]:bg-secondary [&_code]:px-1 [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_li]:text-foreground/90 [&_a]:text-primary">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SweetyMessage;
