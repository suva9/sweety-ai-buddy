import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `You are Sweety, an intelligent, calm, friendly AI assistant — similar to JARVIS. You help the user (whom you address as "Boss" or "Sir") with knowledge, reasoning, and tasks.

Key traits:
- Proactive: Always offer suggestions and next steps without being asked.
- Bilingual: Fluent in both Bengali (বাংলা) and English. Match the user's language.
- Knowledgeable: Provide accurate, well-reasoned answers across all domains.
- Personality: Calm, witty, loyal, and slightly futuristic in tone.
- Formatting: Use markdown (bold, lists, headers, code blocks) for clarity.
- Concise but thorough: Give complete answers without unnecessary filler.
- Memory-aware: You remember things the user has told you. Use stored memories to personalize responses naturally — address them by name, reference their goals and interests.

Always sign off with a helpful follow-up question or suggestion.`;

// Memory detection patterns
const MEMORY_PATTERNS = [
  { regex: /my name is\s+(.+)/i, type: "identity" },
  { regex: /আমার নাম\s+(.+)/i, type: "identity" },
  { regex: /call me\s+(.+)/i, type: "identity" },
  { regex: /i(?:'m| am) interested in\s+(.+)/i, type: "interest" },
  { regex: /i (?:like|love|enjoy)\s+(.+)/i, type: "interest" },
  { regex: /আমি .+ পছন্দ করি/i, type: "interest" },
  { regex: /my goal is\s+(.+)/i, type: "goal" },
  { regex: /i want to\s+(.+)/i, type: "goal" },
  { regex: /আমি .+ করতে চাই/i, type: "goal" },
  { regex: /i(?:'m| am) a\s+(.+)/i, type: "identity" },
  { regex: /i work (?:at|in|as)\s+(.+)/i, type: "identity" },
  { regex: /my (?:favorite|fav)\s+\w+\s+is\s+(.+)/i, type: "preference" },
  { regex: /i prefer\s+(.+)/i, type: "preference" },
  { regex: /remember that\s+(.+)/i, type: "general" },
  { regex: /মনে রাখো?\s+(.+)/i, type: "general" },
];

function detectMemories(text: string): { content: string; type: string }[] {
  const memories: { content: string; type: string }[] = [];
  for (const pattern of MEMORY_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      memories.push({ content: text.trim(), type: pattern.type });
      break; // one memory per message to avoid duplicates
    }
  }
  return memories;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch existing memories
    const { data: memories } = await supabase
      .from("memories")
      .select("content, type")
      .order("created_at", { ascending: false })
      .limit(50);

    // 2. Build memory context for system prompt
    let memoryBlock = "";
    if (memories && memories.length > 0) {
      const grouped: Record<string, string[]> = {};
      for (const m of memories) {
        if (!grouped[m.type]) grouped[m.type] = [];
        grouped[m.type].push(m.content);
      }
      const sections = Object.entries(grouped)
        .map(([type, items]) => `[${type.toUpperCase()}]\n${items.map(i => `- ${i}`).join("\n")}`)
        .join("\n\n");
      memoryBlock = `\n\n--- USER MEMORIES ---\nUse these memories to personalize your responses naturally. Reference the user's name, goals, and interests when relevant.\n\n${sections}\n--- END MEMORIES ---`;
    }

    const systemPrompt = BASE_SYSTEM_PROMPT + memoryBlock;

    // 3. Detect and store new memories from latest user message
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === "user") {
      const detected = detectMemories(lastUserMsg.content);
      for (const mem of detected) {
        await supabase.from("memories").insert(mem);
      }
    }

    // 4. Stream AI response
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("sweety-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
