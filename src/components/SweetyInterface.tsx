import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SweetyOrb from "./SweetyOrb";
import SweetyInput from "./SweetyInput";
import SweetyMessage from "./SweetyMessage";
import ChatHistorySidebar from "./ChatHistorySidebar";
import SweetySettingsPanel from "./SweetySettingsPanel";
import { useSpeech } from "@/hooks/useSpeech";
import { useMemories } from "@/hooks/useMemories";
import { useChatHistory } from "@/hooks/useChatHistory";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "sonner";
import {
  Brain, Volume2, VolumeX, Clock, Battery, Smartphone, Calculator,
  Sparkles, Zap, Globe, Music, Share2, Bell, Timer,
  MapPin, Menu, Settings, Plus,
} from "lucide-react";
import { CommandResult, executeCommand, parseDirectCommand, cleanAIResponse } from "@/lib/commands";
import { isDesktop, desktopExec } from "@/lib/desktopBridge";

type Msg = { role: "user" | "assistant"; content: string; command?: CommandResult | null };

const QUICK_ACTIONS = [
  { icon: Clock, label: "Time", command: "time", color: "from-blue-500 to-cyan-400" },
  { icon: Battery, label: "Battery", command: "battery status", color: "from-green-500 to-emerald-400" },
  { icon: Smartphone, label: "Device", command: "device info", color: "from-purple-500 to-violet-400" },
  { icon: Calculator, label: "Calculate", command: "calculate 25*4+10", color: "from-orange-500 to-amber-400" },
  { icon: Sparkles, label: "Motivate", command: "motivate me", color: "from-pink-500 to-rose-400" },
  { icon: Zap, label: "Joke", command: "tell me a joke", color: "from-yellow-500 to-amber-400" },
  { icon: Globe, label: "YouTube", command: "open youtube", color: "from-red-500 to-rose-400" },
  { icon: Music, label: "Lofi", command: "play lofi music", color: "from-indigo-500 to-blue-400" },
  { icon: Share2, label: "Share", command: "share this page", color: "from-teal-500 to-cyan-400" },
  { icon: Bell, label: "Remind", command: "remind me in 5 minutes to take a break", color: "from-fuchsia-500 to-pink-400" },
  { icon: Timer, label: "Timer", command: "set timer 2 minutes", color: "from-amber-500 to-yellow-400" },
  { icon: MapPin, label: "Location", command: "my location", color: "from-emerald-500 to-green-400" },
];

function getSmartGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Late night, Boss. I'm still here for you.";
  if (hour < 12) return "Good morning, Boss. Ready for a great day.";
  if (hour < 17) return "Good afternoon, Boss. What can I do?";
  if (hour < 20) return "Good evening, Boss. At your service.";
  return "Good night, Boss. Need anything?";
}

const THINKING_PHRASES = ["Thinking...", "Analyzing...", "Processing...", "Almost there..."];
const ThinkingIndicator = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % THINKING_PHRASES.length), 1500);
    return () => clearInterval(t);
  }, []);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 px-4 py-3">
      <SweetyOrb size="sm" isProcessing={true} />
      <motion.span key={idx} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-muted-foreground font-display">
        {THINKING_PHRASES[idx]}
      </motion.span>
    </motion.div>
  );
};

const SweetyInterface = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { speak, speakingId, muted, toggleMute } = useSpeech();
  const { memories, fetchMemories } = useMemories();
  const { settings, updateSetting } = useSettings();
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    loadMessages,
    saveMessage,
    deleteConversation,
    startNewChat,
    fetchConversations,
  } = useChatHistory();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load messages when selecting a conversation
  const handleSelectConversation = useCallback(async (id: string) => {
    setActiveConversationId(id);
    const msgs = await loadMessages(id);
    setMessages(msgs.map((m) => ({ role: m.role, content: m.content })));
    setShowWelcome(false);
  }, [loadMessages, setActiveConversationId]);

  const handleNewChat = useCallback(() => {
    startNewChat();
    setMessages([]);
    setShowWelcome(true);
  }, [startNewChat]);

  // Listen for reminder events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const reminderMsg: Msg = {
        role: "assistant",
        content: `**Reminder Alert**\n\n${detail.label}\n\nBoss, it's time.`,
      };
      setMessages((prev) => [...prev, reminderMsg]);
      if (settings.autoSpeak) speak(detail.label, `reminder-${detail.id}`).catch(() => {});
      toast.info(`Reminder: ${detail.label}`);
    };
    window.addEventListener("sweety-reminder", handler);
    return () => window.removeEventListener("sweety-reminder", handler);
  }, [speak, settings.autoSpeak]);

  const handleSend = useCallback(async (input: string) => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    setShowWelcome(false);
    const userMsg: Msg = { role: "user", content: trimmedInput };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    // Create or reuse conversation
    let convId = activeConversationId;
    if (!convId) {
      try {
        convId = await createConversation(trimmedInput);
      } catch {
        convId = null;
      }
    }
    if (convId) saveMessage(convId, "user", trimmedInput);

    const finishAssistant = async (text: string) => {
      if (convId) saveMessage(convId, "assistant", text);
      fetchConversations();
      if (settings.autoSpeak) {
        speak(text.replace(/[*#`_\[\]()]/g, ""), `msg-${newMessages.length}`).catch(() => {});
      }
    };

    // Terminal command — prefer local desktop bridge, fall back to tunnel
    const terminalMatch = trimmedInput.match(/^run\s+command:\s*(.+)$/i);
    if (terminalMatch) {
      const shellCmd = terminalMatch[1].trim();
      try {
        let output: string;
        if (isDesktop) {
          output = await desktopExec(shellCmd);
        } else {
          const termResp = await fetch("https://james-uniprotkb-cyber-killing.trycloudflare.com/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: shellCmd }),
          });
          if (!termResp.ok) throw new Error(`Terminal server returned ${termResp.status}`);
          const termData = await termResp.json();
          output = termData.output || termData.response || termData.result || JSON.stringify(termData);
        }
        const content = `**Terminal Output**${isDesktop ? " (local)" : ""}\n\`\`\`\n${output}\n\`\`\``;
        setMessages((prev) => [...prev, { role: "assistant", content }]);
        await finishAssistant(content);
      } catch (err) {
        const errMsg = isDesktop
          ? `Boss, local command failed: ${(err as Error).message}`
          : "Boss, can't connect to terminal server right now.";
        setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
        await finishAssistant(errMsg);
      }
      setIsLoading(false);
      return;
    }

    // Direct commands
    const directCommand = await parseDirectCommand(trimmedInput);
    if (directCommand) {
      const content = directCommand.action === "utility"
        ? directCommand.message
        : `**Command Executed**\n\n${directCommand.message}`;
      setMessages((prev) => [...prev, { role: "assistant", content, command: directCommand }]);
      if (directCommand.action !== "utility") executeCommand(directCommand);
      await finishAssistant(content);
      setIsLoading(false);
      return;
    }

    // Offline fallback
    if (!navigator.onLine) {
      const offlineMsg = "Boss, you're offline. Please check your internet connection.";
      setMessages((prev) => [...prev, { role: "assistant", content: offlineMsg }]);
      await finishAssistant(offlineMsg);
      setIsLoading(false);
      return;
    }

    // AI chat (streaming) — only send last 8 messages for context efficiency
    let assistantSoFar = "";
    const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sweety-chat`;
    const contextMessages = newMessages.slice(-8);

    try {
      const resp = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: contextMessages }),
      });

      if (resp.status === 429) { toast.error("Rate limit exceeded."); setIsLoading(false); return; }
      if (resp.status === 402) { toast.error("Credits exhausted."); setIsLoading(false); return; }
      if (!resp.ok) throw new Error("Failed to connect to Sweety");

      const contentType = resp.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await resp.json();
        if (data.type === "command") {
          const command = data as CommandResult;
          const cmdMsg = cleanAIResponse(command.message || `Opening ${command.target}`);
          setMessages((prev) => [...prev, { role: "assistant", content: cmdMsg, command }]);
          executeCommand(command);
          await finishAssistant(cmdMsg);
          fetchMemories();
          setIsLoading(false);
          return;
        }
        if (data.type === "chat" && data.response) {
          const cleaned = cleanAIResponse(data.response);
          setMessages((prev) => [...prev, { role: "assistant", content: cleaned }]);
          await finishAssistant(cleaned);
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
        const cleaned = cleanAIResponse(assistantSoFar);
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: cleaned } : m);
          }
          return [...prev, { role: "assistant", content: cleaned }];
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

      if (assistantSoFar) {
        const cleanedFinal = cleanAIResponse(assistantSoFar);
        await finishAssistant(cleanedFinal);
      }
      fetchMemories();
    } catch (error) {
      console.error(error);
      toast.error("Connection to Sweety failed");
      const fallbackText = "Boss, connection issue. Please try again.";
      setMessages((prev) => [...prev, { role: "assistant", content: fallbackText }]);
      await finishAssistant(fallbackText);
    }

    setIsLoading(false);
  }, [messages, isLoading, speak, fetchMemories, activeConversationId, createConversation, saveMessage, fetchConversations, settings.autoSpeak]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden relative">
      {/* Background */}
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

      {/* Sidebar */}
      <ChatHistorySidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        onDelete={deleteConversation}
      />

      {/* Settings */}
      <AnimatePresence>
        <SweetySettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onUpdate={updateSetting}
        />
      </AnimatePresence>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-border/10"
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 rounded-lg glass flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <Menu className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{
            background: "linear-gradient(135deg, hsl(340 80% 50%), hsl(200 100% 55%))"
          }}>
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <div>
            <h1 className="font-display text-sm font-semibold tracking-wide text-foreground">Sweety</h1>
            <p className="text-[9px] text-primary/80 font-display">
              Online{isDesktop && <span className="ml-1 px-1 py-px rounded bg-primary/20 text-primary">Desktop</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {memories.length > 0 && (
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-display mr-1">
              <Brain className="w-3 h-3 text-primary/60" />
              <span>{memories.length}</span>
            </div>
          )}
          <button
            onClick={handleNewChat}
            className="w-8 h-8 rounded-lg glass flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <Plus className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={toggleMute}
            className="w-8 h-8 rounded-lg glass flex items-center justify-center hover:bg-secondary transition-colors"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-muted-foreground" /> : <Volume2 className="w-3.5 h-3.5 text-primary" />}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-8 h-8 rounded-lg glass flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </motion.header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 relative z-10">
        <AnimatePresence>
          {showWelcome && messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] gap-5"
            >
              <SweetyOrb size="lg" isProcessing={false} />

              <div className="text-center space-y-2">
                <motion.div
                  className="inline-block px-3 py-1 rounded-full glass text-[10px] font-display text-primary tracking-widest uppercase"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Sweety AI
                </motion.div>
                <h2 className="font-display text-xl font-bold text-foreground">
                  How can I help, Boss?
                </h2>
                <p className="font-display text-xs text-muted-foreground max-w-xs mx-auto">
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
                    transition={{ delay: 0.4 + i * 0.04 }}
                    onClick={() => handleSend(action.command)}
                    className="glass rounded-xl px-2 py-3 flex flex-col items-center gap-1.5 hover:bg-secondary/50 active:scale-95 transition-all duration-200 group"
                  >
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity`}>
                      <action.icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-display text-[9px] text-muted-foreground group-hover:text-foreground transition-colors">
                      {action.label}
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-2 justify-center max-w-sm px-2">
                {[
                  "What can you do?",
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

        {isLoading && messages[messages.length - 1]?.role === "user" && <ThinkingIndicator />}
      </div>

      {/* Input */}
      <div className="relative z-10 px-4 pb-5 pt-2">
        <SweetyInput onSend={handleSend} isLoading={isLoading} language={settings.language} />
      </div>
    </div>
  );
};

export default SweetyInterface;
