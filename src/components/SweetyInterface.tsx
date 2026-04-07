import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SweetyWaveform from "./SweetyWaveform";
import SweetyInput from "./SweetyInput";
import SweetyMessage from "./SweetyMessage";
import { useSpeech } from "@/hooks/useSpeech";
import { useMemories } from "@/hooks/useMemories";
import { toast } from "sonner";
import { Brain, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import { useWakeWord } from "@/hooks/useWakeWord";
import { CommandResult, executeCommand, parseDirectCommand } from "@/lib/commands";

type Msg = { role: "user" | "assistant"; content: string; command?: CommandResult | null };

const SweetyInterface = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { speak, speakingId, muted, toggleMute } = useSpeech();
  const { memories, fetchMemories } = useMemories();
  const [wakeWordEnabled, setWakeWordEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sweety-wakeword") !== "false";
    }
    return true;
  });

  const handleSendRef = useRef<((input: string) => void) | null>(null);

  const handleWakeCommand = useCallback((command: string) => {
    handleSendRef.current?.(command);
  }, []);

  const { listening: wakeListening, wakeDetected } = useWakeWord({
    onCommand: handleWakeCommand,
    enabled: wakeWordEnabled,
    paused: isLoading || Boolean(speakingId),
  });

  const toggleWakeWord = useCallback(() => {
    setWakeWordEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("sweety-wakeword", String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (input: string) => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    setShowWelcome(false);
    const userMsg: Msg = { role: "user", content: trimmedInput };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    const terminalMatch = trimmedInput.match(/^run\s+command:\s*(.+)$/i);
    if (terminalMatch) {
      const shellCmd = terminalMatch[1].trim();
      try {
        const termResp = await fetch("https://james-uniprotkb-cyber-killing.trycloudflare.com/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: shellCmd }),
        });

        if (!termResp.ok) {
          throw new Error(`Terminal server returned ${termResp.status}`);
        }

        const termData = await termResp.json();
        const output = termData.output || termData.response || termData.result || JSON.stringify(termData);
        const assistantMsg: Msg = {
          role: "assistant",
          content: `🖥️ **Terminal Output**\n\`\`\`\n${output}\n\`\`\``,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        speak(output, `msg-${newMessages.length}`).catch(() => {});
      } catch (error) {
        console.error("Terminal command failed:", error);
        const errMsg = "Boss, terminal server এ connect করতে পারছি না। Server চালু আছে কিনা দেখুন।";
        setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
        speak(errMsg, `msg-${newMessages.length}`).catch(() => {});
      }
      setIsLoading(false);
      return;
    }

    const directCommand = parseDirectCommand(trimmedInput);
    if (directCommand) {
      const assistantMsg: Msg = {
        role: "assistant",
        content: `🚀 **Command Executed**\n\n${directCommand.message}`,
        command: directCommand,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      executeCommand(directCommand);
      speak(directCommand.message, `msg-${newMessages.length}`).catch(() => {});
      setIsLoading(false);
      return;
    }

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

      if (!resp.ok) {
        throw new Error("Failed to connect to Sweety");
      }

      const contentType = resp.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await resp.json();

        if (data.type === "command") {
          const command = data as CommandResult;
          const cmdMsg = command.message || (command.action === "search" ? `Searching \"${command.data}\"` : `Opening ${command.target}`);
          const assistantMsg: Msg = {
            role: "assistant",
            content: `🚀 **Command Executed**\n\n${cmdMsg}`,
            command,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          executeCommand(command);
          speak(cmdMsg, `msg-${newMessages.length}`).catch(() => {});
          fetchMemories();
          setIsLoading(false);
          return;
        }

        if (data.type === "chat" && data.response) {
          const assistantMsg: Msg = { role: "assistant", content: data.response };
          setMessages((prev) => [...prev, assistantMsg]);
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
            return prev.map((message, index) =>
              index === prev.length - 1 ? { ...message, content: assistantSoFar } : message,
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
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

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

      if (assistantSoFar) {
        speak(assistantSoFar, `msg-${newMessages.length}`).catch(() => {});
      }

      fetchMemories();
    } catch (error) {
      console.error(error);
      toast.error("Connection to Sweety failed");
      const fallbackText = "Boss, connection এ একটু সমস্যা হচ্ছে। আবার চেষ্টা করুন।";
      setMessages((prev) => [...prev, { role: "assistant", content: fallbackText }]);
      speak(fallbackText, `msg-${newMessages.length}`).catch(() => {});
    }

    setIsLoading(false);
  };

  handleSendRef.current = handleSend;

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
        <div className="flex items-center gap-3">
          {memories.length > 0 && (
            <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted-foreground">
              <Brain className="w-3 h-3 text-primary" />
              {memories.length} memories
            </div>
          )}
          <button
            onClick={toggleWakeWord}
            className={`flex items-center gap-1.5 font-mono text-[10px] tracking-widest transition-colors ${
              wakeWordEnabled ? "text-primary" : "text-muted-foreground hover:text-primary"
            }`}
            title={wakeWordEnabled ? "Disable wake word" : "Enable wake word"}
          >
            {wakeWordEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            {wakeWordEnabled ? (wakeDetected ? "HEARD!" : wakeListening ? "WAKE" : "WAKE") : "WAKE OFF"}
          </button>
          <button
            onClick={toggleMute}
            className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted-foreground hover:text-primary transition-colors"
            title={muted ? "Unmute Sweety" : "Mute Sweety"}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-primary" />}
            {muted ? "MUTED" : "VOICE"}
          </button>
          <div className="font-mono text-[10px] tracking-widest text-muted-foreground">
            GEMINI CORE
          </div>
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
                  "Open YouTube",
                  "Open WhatsApp",
                  "Search latest AI news",
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
