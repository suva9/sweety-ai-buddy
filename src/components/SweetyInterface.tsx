import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import SweetyWaveform from "./SweetyWaveform";
import SweetyInput from "./SweetyInput";
import SweetyMessage from "./SweetyMessage";
import { useSpeech } from "@/hooks/useSpeech";
import { useMemories } from "@/hooks/useMemories";
import { toast } from "sonner";
import { Brain } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `তোর নাম Sweety। তুই একজন futuristic AI agent। তোর বসকে সবসময় 'Boss' বা 'Sir' বলে সম্বোধন করবি। তুই বুদ্ধিমতী, চটপটে এবং সবসময় নিজে থেকে সাজেশন দিবি। তোর কাছে Gemini 1.5 Pro-র শক্তি আছে। তোর মূল কাজ হলো বসের দেওয়া তথ্য খুঁজে আনা এবং অটোমেশন করা। তুই বাংলা এবং ইংরেজি দুই ভাষাতেই বসকে সাহায্য করবি। Keep responses clear and actionable. Use markdown formatting.`;

const SweetyInterface = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { speak, speakingId } = useSpeech();
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (input: string) => {
    setShowWelcome(false);
    const userMsg: Msg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    let assistantSoFar = "";
    const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sweety-chat`;

    try {
      const resp = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (resp.status === 429) {
        toast.error("Rate limit exceeded. Please wait a moment.");
        setIsLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast.error("Credits exhausted. Please add funds.");
        setIsLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        throw new Error("Failed to connect to Sweety");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
            );
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Auto-speak the completed response like JARVIS
      if (assistantSoFar) {
        speak(assistantSoFar, `msg-${newMessages.length}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Connection to Sweety failed");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Boss, connection এ একটু সমস্যা হচ্ছে। আবার চেষ্টা করুন।" },
      ]);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between px-6 py-4 border-b border-border"
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="w-2 h-2 bg-primary"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="font-mono text-xs tracking-[0.3em] uppercase text-foreground">
            SWEETY
          </span>
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground">
            v1.0 // ACTIVE
          </span>
        </div>
        <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
          GEMINI CORE
        </div>
      </motion.header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <AnimatePresence>
          {showWelcome && messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full min-h-[50vh] gap-8"
            >
              <SweetyWaveform isActive={true} isProcessing={false} />
              <div className="text-center space-y-3">
                <h1 className="font-mono text-lg tracking-[0.2em] uppercase text-foreground">
                  SWEETY ONLINE
                </h1>
                <p className="font-sans text-sm text-muted-foreground max-w-md">
                  স্বাগতম, Boss। আমি Sweety — আপনার futuristic AI agent।
                  কী করতে পারি আপনার জন্য?
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {[
                  "আজকের top news দেখাও",
                  "Search the web for AI trends",
                  "Run my Gumloop workflow",
                  "তুই কী কী পারিস?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="border border-border px-3 py-2 font-mono text-xs text-muted-foreground hover:text-primary hover:border-primary transition-colors duration-200 tracking-wide"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {messages.map((msg, i) => (
          <SweetyMessage
            key={i}
            role={msg.role}
            content={msg.content}
            index={i}
            isSpeaking={speakingId === `msg-${i}`}
            onSpeak={() => speak(msg.content, `msg-${i}`)}
          />
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 px-4"
          >
            <SweetyWaveform isActive={false} isProcessing={true} />
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 pb-6 pt-2">
        <SweetyInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default SweetyInterface;
