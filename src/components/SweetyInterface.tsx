import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SweetyOrb from "./SweetyOrb";
import SweetyInput from "./SweetyInput";
import SweetyMessage from "./SweetyMessage";
import { useSpeech } from "@/hooks/useSpeech";
import { useMemories } from "@/hooks/useMemories";
import { toast } from "sonner";
import {
  Brain, Volume2, VolumeX, Clock, Battery, Smartphone, Calculator,
  Sparkles, Zap, Globe, Music, Copy, Share2, Vibrate, Maximize,
  Sun, Moon, Wifi, MapPin,
} from "lucide-react";
import { CommandResult, executeCommand, parseDirectCommand } from "@/lib/commands";

type Msg = { role: "user" | "assistant"; content: string; command?: CommandResult | null };

const QUICK_ACTIONS = [
  { icon: Clock, label: "সময়", command: "time", color: "from-blue-500 to-cyan-400" },
  { icon: Battery, label: "ব্যাটারি", command: "battery status", color: "from-green-500 to-emerald-400" },
  { icon: Smartphone, label: "ডিভাইস", command: "device info", color: "from-purple-500 to-violet-400" },
  { icon: Calculator, label: "হিসাব", command: "calculate 25*4+10", color: "from-orange-500 to-amber-400" },
  { icon: Sparkles, label: "মোটিভেশন", command: "motivate me", color: "from-pink-500 to-rose-400" },
  { icon: Zap, label: "জোক", command: "tell me a joke", color: "from-yellow-500 to-amber-400" },
  { icon: Globe, label: "YouTube", command: "open youtube", color: "from-red-500 to-rose-400" },
  { icon: Music, label: "Lofi", command: "play lofi music", color: "from-indigo-500 to-blue-400" },
  { icon: Share2, label: "শেয়ার", command: "share this page", color: "from-teal-500 to-cyan-400" },
  { icon: Vibrate, label: "Vibrate", command: "vibrate", color: "from-fuchsia-500 to-pink-400" },
  { icon: Maximize, label: "Fullscreen", command: "fullscreen", color: "from-slate-500 to-gray-400" },
  { icon: MapPin, label: "Location", command: "my location", color: "from-emerald-500 to-green-400" },
];

function getSmartGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "রাত গভীর হয়েছে Boss, তবুও আমি জেগে আছি। 🌙";
  if (hour < 12) return "সুপ্রভাত Boss! আজকের দিনটা অসাধারণ হবে! ☀️";
  if (hour < 17) return "শুভ দুপুর Boss! কী করতে পারি? 🚀";
  if (hour < 20) return "শুভ সন্ধ্যা Boss! বলুন, আমি ready! ✨";
  return "শুভ রাত্রি Boss! কিছু দরকার? 🌃";
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

    // Direct commands
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
    <div className="flex flex-col h-screen bg-background overflow-hidden relative">
      {/* Background gradient mesh */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <motion.div
        className="fixed top-10 -left-20 w-60 h-60 gradient-orb pointer-events-none"
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="fixed bottom-20 -right-20 w-48 h-48 gradient-orb-2 pointer-events-none"
        animate={{ x: [0, -20, 0], y: [0, -30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
            background: "linear-gradient(135deg, hsl(340 80% 50%), hsl(200 100% 55%))"
          }}>
            <span className="text-[10px] font-bold text-white font-display">S</span>
          </div>
          <div>
            <h1 className="font-display text-sm font-semibold tracking-wide text-foreground">Sweety AI</h1>
            <p className="text-[10px] text-primary font-display text-glow">Online • Ready to help</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {memories.length > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-display">
              <Brain className="w-3.5 h-3.5 text-primary" />
              <span>{memories.length}</span>
            </div>
          )}
          <button
            onClick={toggleMute}
            className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-secondary transition-colors"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-muted-foreground" /> : <Volume2 className="w-3.5 h-3.5 text-primary" />}
          </button>
        </div>
      </motion.header>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-3 relative z-10">
        <AnimatePresence>
          {showWelcome && messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] gap-5"
            >
              {/* Orb */}
              <SweetyOrb size="lg" isProcessing={false} />

              {/* Title */}
              <div className="text-center space-y-2">
                <motion.div
                  className="inline-block px-3 py-1 rounded-full glass text-[10px] font-display text-primary tracking-widest uppercase"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  ✨ Sweety 2.0
                </motion.div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Smart AI Assistant
                </h2>
                <p className="font-display text-sm text-muted-foreground max-w-xs mx-auto">
                  {getSmartGreeting()}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-4 gap-2 w-full max-w-sm px-2">
                {QUICK_ACTIONS.map((action, i) => (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    onClick={() => handleSend(action.command)}
                    className="glass rounded-xl px-2 py-3 flex flex-col items-center gap-1.5 hover:bg-secondary/50 active:scale-95 transition-all duration-200 group"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity`}>
                      <action.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-display text-[9px] text-muted-foreground group-hover:text-foreground transition-colors">
                      {action.label}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Text suggestions */}
              <div className="flex flex-wrap gap-2 justify-center max-w-sm px-2">
                {[
                  "তুই কী কী পারিস?",
                  "Search AI news",
                  "Open WhatsApp",
                  "Play lofi music",
                ].map((q, i) => (
                  <motion.button
                    key={q}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    onClick={() => handleSend(q)}
                    className="glass rounded-full px-3 py-1.5 font-display text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
                  >
                    {q}
                  </motion.button>
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-4 py-3"
          >
            <SweetyOrb size="sm" isProcessing={true} />
            <motion.span
              className="text-xs text-muted-foreground font-display"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Sweety is thinking...
            </motion.span>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="relative z-10 px-4 pb-5 pt-2">
        <SweetyInput onSend={handleSend} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default SweetyInterface;
