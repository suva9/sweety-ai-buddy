import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export function useChatHistory() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (data) setConversations(data);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const createConversation = useCallback(async (firstMessage: string): Promise<string> => {
    const title = firstMessage.length > 40 ? firstMessage.slice(0, 40) + "..." : firstMessage;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ title })
      .select()
      .single();
    if (error || !data) throw new Error("Failed to create conversation");
    setActiveConversationId(data.id);
    setConversations((prev) => [data, ...prev]);
    return data.id;
  }, []);

  const loadMessages = useCallback(async (conversationId: string): Promise<ChatMessage[]> => {
    setLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setLoading(false);
    return (data as ChatMessage[]) || [];
  }, []);

  const saveMessage = useCallback(async (conversationId: string, role: "user" | "assistant", content: string) => {
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      role,
      content,
    });
    // Update conversation's updated_at
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) setActiveConversationId(null);
  }, [activeConversationId]);

  const startNewChat = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    loading,
    fetchConversations,
    createConversation,
    loadMessages,
    saveMessage,
    deleteConversation,
    startNewChat,
  };
}
