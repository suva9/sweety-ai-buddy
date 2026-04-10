import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SweetyWaveform from "./SweetyWaveform";
import SweetyInput from "./SweetyInput";
import SweetyMessage from "./SweetyMessage";
import { useSpeech } from "@/hooks/useSpeech";
import { useMemories } from "@/hooks/useMemories";
import { toast } from "sonner";
import { Brain, Volume2, VolumeX, Zap, Clock, Battery, Smartphone, Calculator, Sparkles } from "lucide-react";
import { CommandResult, executeCommand, parseDirectCommand } from "@/lib/commands";

type Msg = { role: "user" | "assistant"; content: string; command?: CommandResult | null };

const QUICK_ACTIONS = [
  { icon: Clock, label: "সময়", command: "time" },
  { icon: Battery, label: "ব্যাটারি", command: "battery status" },
  { icon: Smartphone, label: "ডিভাইস", command: "device info" },
  { icon: Calculator, label: "হিসাব", command: "calculate 25*4+10" },
  { icon: Sparkles, label: "মোটিভেশন", command: "motivate me" },
  { icon: Zap, label: "জোক", command: "tell me a joke" },
];

function getSmartGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "রাত গভীর হয়েছে Boss, তবুও আমি জেগে আছি আপনার জন্য।";
  if (hour < 12) return "সুপ্রভাত Boss! আজকের দিনটা দারুণ করে দিই?";
  if (hour < 17) return "শুভ দুপুর Boss! কাজের ফাঁকে কিছু দরকার?";
  if (hour < 20) return "শুভ সন্ধ্যা Boss! বলুন কী সাহায্য করতে পারি?";
  return "শুভ রাত্রি Boss! ঘুমানোর আগে কিছু দরকার?";
}

const SweetyInterface = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { speak, speakingId, muted, toggleMute } = useSpeech();
  const { memories, fetchMemories } = useMemories();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async (input: string) => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    setShowWelcome(false);
    const userMsg: Msg = { role: "user", content: trimmedInput };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    // Terminal command
    const terminalMatch = trimmedInput.match(/^run\s+command:\s*(.+)$/i);
    if (terminalMatch) {
      const shellCmd = terminalMatch[1].trim();
      try {
        const termResp = await fetch("https://james-uniprotkb-cyber-killing.trycloudflare.com/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: shellCmd }),
        });
        if (!termResp.ok) throw new Error(`Terminal server returned ${termResp.status}`);
        const termData = await termResp.json();
        const output = termData.output || termData.response || termData.result || JSON.stringify(termData);
        const assistantMsg: Msg = { role: "assistant", content: `🖥️ **Terminal Output**\n\`\`\`\n${output}\n\`\`\`` };
        setMessages((prev) => [...prev, assistantMsg]);
        speak(output, `msg-${newMessages.length}`).catch(() => {});
      } catch {
        const errMsg = "Boss, terminal server এ connect করতে পারছি না।";
        setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
        speak(errMsg, `msg-${newMessages.length}`).catch(() => {});
      }
      setIsLoading(false);
      return;
    }

    // Direct commands (instant, no API call)
    const directCommand = await parseDirectCommand(trimmedInput);
    if (directCommand) {
      const assistantMsg: Msg = {
        role: "assistant",
        content: directCommand.action === "utility"
          ? directCommand.message
          : `🚀 **Command Executed**\n\n${directCommand.message}`,
        command: directCommand,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (directCommand.action !== "utility") executeCommand(directCommand);
      speak(directCommand.message.replace(/[*#`_\[\]()]/g, ""), `msg-${newMessages.length}`).catch(() => {});
      setIsLoading(false);
      return;
    }

    // AI chat (streaming)
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

      if (resp.status === 429) { toast.error("Rate limit exceeded."); setIsLoading(false); return; }
      if (resp.status === 402) { toast.error("Credits exhausted."); setIsLoading(false); return; }
      if (!resp.ok) throw new Error("Failed to connect to Sweety");

      const contentType = resp.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await resp.json();

        if (data.type === "command") {
          const command = data as CommandResult;
          const cmdMsg = command.message || `Opening ${command.target}`;
          const assistantMsg: Msg = { role: "assistant", content: `🚀 **Command Executed**\n\n${cmdMsg}`, command };
          setMessages((prev) => [...prev, assistantMsg]);
          executeCommand(command);
          speak(cmdMsg, `msg-${newMessages.length}`).catch(() => {});
          fetchMemories();
          setIsLoading(false);
          return;
        }

        if (data.type === "chat" && data.response) {
          setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
          speak(data.response, `msg-${newMessages.length}`).catch(() => {});
          fetchMemories();
          setIsLoading(false);
          return;
        }
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      const upsertAssistant = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
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
            textBuffer = `${line}\n${textBuffer}`;
            break;
          }
        }
      }

      if (assistantSoFar) speak(assistantSoFar, `msg-${newMessages.length}`).catch(() => {});
      fetchMemories();
    } catch (error) {
      console.error(error);
      toast.error("Connection to Sweety failed");
      const fallbackText = "Boss, connection এ সমস্যা হচ্ছে। আবার চেষ্টা করুন।";
      setMessages((prev) => [...prev, { role: "assistant", content: fallbackText }]);
      speak(fallbackText, `msg-${newMessages.length}`).catch(() => {});
    }

    setIsLoading(false);
  }, [messages, isLoading, speak, fetchMemories]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between px-4 py-3 border-b border-border"
      >
        <div className="flex items-center gap-2">
          <motion.div
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.1, 0.9] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="font-mono text-xs tracking-[0.3em] uppercase text-foreground">
            SWEETY
          </span>
          <span className="font-mono text-[9px] tracking-widest text-muted-foreground">
            AI AGENT
          </span>
        </div>
        <div className="flex items-center gap-3">
          {memories.length > 0 && (
            <div className="flex items-center gap-1 font-mono text-[10px] tracking-widest text-muted-foreground">
              <Brain className="w-3 h-3 text-primary" />
              {memories.length}
            </div>
          )}
          <button
            onClick={toggleMute}
            className="flex items-center gap-1 font-mono text-[10px] tracking-widest text-muted-foreground hover:text-primary transition-colors"
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-primary" />}
            {muted ? "MUTED" : "VOICE"}
          </button>
        </div>
      </motion.header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence>
          {showWelcome && messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full min-h-[50vh] gap-6"
            >
              <SweetyWaveform isActive={true} isProcessing={false} />
              <div className="text-center space-y-2">
                <h1 className="font-mono text-lg tracking-[0.2em] uppercase text-foreground">
                  SWEETY ONLINE
                </h1>
                <p className="font-sans text-sm text-muted-foreground max-w-md">
                  {getSmartGreeting()} আমি Sweety — আপনার personal AI agent। 🚀
                </p>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.command)}
                    className="flex flex-col items-center gap-1.5 border border-border px-2 py-3 hover:border-primary hover:bg-secondary/50 transition-all duration-200 group"
                  >
                    <action.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="font-mono text-[10px] text-muted-foreground group-hover:text-foreground transition-colors tracking-wide">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Text quick actions */}
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {[
                  "Open YouTube",
                  "Open WhatsApp",
                  "Search latest AI news",
                  "Play lofi music",
                  "তুই কী কী পারিস?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="border border-border px-3 py-2 font-mono text-[10px] text-muted-foreground hover:text-primary hover:border-primary transition-colors duration-200 tracking-wide"
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
      <div className="px-4 pb-4 pt-2">
        <SweetyInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default SweetyInterface;
