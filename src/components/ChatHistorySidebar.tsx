import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, Trash2, X } from "lucide-react";
import { Conversation } from "@/hooks/useChatHistory";
import { formatDistanceToNow } from "date-fns";

interface ChatHistorySidebarProps {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

const ChatHistorySidebar = ({
  open,
  onClose,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: ChatHistorySidebarProps) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[280px] glass-strong border-r border-border/20 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border/20">
              <h2 className="font-display text-sm font-semibold text-foreground">Chat History</h2>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* New Chat */}
            <div className="px-3 py-3">
              <button
                onClick={() => { onNew(); onClose(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-primary/30 text-primary hover:bg-primary/5 transition-all font-display text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Chat</span>
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
              {conversations.length === 0 ? (
                <div className="text-center py-10">
                  <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="font-display text-xs text-muted-foreground">No conversations yet</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      activeId === conv.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-secondary/50 border border-transparent"
                    }`}
                    onClick={() => { onSelect(conv.id); onClose(); }}
                  >
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${
                      activeId === conv.id ? "text-primary" : "text-muted-foreground/50"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-display text-xs truncate ${
                        activeId === conv.id ? "text-foreground" : "text-foreground/70"
                      }`}>
                        {conv.title}
                      </p>
                      <p className="font-display text-[10px] text-muted-foreground/50">
                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/20 transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-destructive/70" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatHistorySidebar;
