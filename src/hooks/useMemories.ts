import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Memory {
  id: string;
  content: string;
  type: string;
  created_at: string;
}

export function useMemories() {
  const [memories, setMemories] = useState<Memory[]>([]);

  const fetchMemories = useCallback(async () => {
    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setMemories(data as Memory[]);
    }
  }, []);

  const deleteMemory = useCallback(async (id: string) => {
    await supabase.from("memories").delete().eq("id", id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  return { memories, fetchMemories, deleteMemory };
}
