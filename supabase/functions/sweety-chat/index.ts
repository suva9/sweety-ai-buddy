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
- Command-aware: You can execute commands for the user. When the user asks you to open an app/website or search something, use the execute_command tool.

Always sign off with a helpful follow-up question or suggestion.`;

// Command detection tool definition
const COMMAND_TOOL = {
  type: "function",
  function: {
    name: "execute_command",
    description: "Execute a command when the user asks to open an app, website, or perform a search. Use this for actionable requests like 'open youtube', 'open whatsapp', 'search AI trends', 'open google', etc.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["open", "search"],
          description: "The action to perform",
        },
        target: {
          type: "string",
          description: "The target app or website (e.g. youtube, whatsapp, google, facebook, gmail, maps, twitter, instagram, github, spotify, netflix, telegram, linkedin, reddit, tiktok, pinterest, amazon)",
        },
        data: {
          type: "string",
          description: "Extra data like search query. Required for 'search' action.",
        },
      },
      required: ["action", "target"],
      additionalProperties: false,
    },
  },
};

// Memory detection patterns
const MEMORY_PATTERNS = [
  { regex: /my name is\s+(.+)/i, type: "identity", extract: (m: string[]) => `User's name is ${m[1].trim()}` },
  { regex: /আমার নাম\s+(.+)/i, type: "identity", extract: (m: string[]) => `User's name is ${m[1].trim()}` },
  { regex: /call me\s+(.+)/i, type: "identity", extract: (m: string[]) => `User wants to be called ${m[1].trim()}` },
  { regex: /i(?:'m| am) a\s+(.+)/i, type: "identity", extract: (m: string[]) => `User is a ${m[1].trim()}` },
  { regex: /i work (?:at|in|as)\s+(.+)/i, type: "identity", extract: (m: string[]) => `User works ${m[0].match(/work (.+)/i)![1].trim()}` },
  { regex: /(.+?)\s+is my\s+(best friend|friend|brother|sister|wife|husband|girlfriend|boyfriend|partner|father|mother|dad|mom|colleague|boss|mentor|loyal friend)/i, type: "relationship", extract: (m: string[]) => `${m[1].trim()} is the user's ${m[2].trim()}` },
  { regex: /my\s+(best friend|friend|brother|sister|wife|husband|girlfriend|boyfriend|partner|father|mother|dad|mom|colleague|boss|mentor|loyal friend)\s+is\s+(.+)/i, type: "relationship", extract: (m: string[]) => `${m[2].trim()} is the user's ${m[1].trim()}` },
  { regex: /(.+?)\s+আমার\s+(বন্ধু|ভাই|বোন|বাবা|মা|স্ত্রী|স্বামী)/i, type: "relationship", extract: (m: string[]) => `${m[1].trim()} is the user's ${m[2].trim()}` },
  { regex: /i(?:'m| am) interested in\s+(.+)/i, type: "interest", extract: (m: string[]) => `User is interested in ${m[1].trim()}` },
  { regex: /i (?:like|love|enjoy)\s+(.+)/i, type: "interest", extract: (m: string[]) => `User likes ${m[1].trim()}` },
  { regex: /আমি (.+) পছন্দ করি/i, type: "interest", extract: (m: string[]) => `User likes ${m[1].trim()}` },
  { regex: /my (?:favorite|fav)\s+(\w+)\s+is\s+(.+)/i, type: "preference", extract: (m: string[]) => `User's favorite ${m[1].trim()} is ${m[2].trim()}` },
  { regex: /i prefer\s+(.+)/i, type: "preference", extract: (m: string[]) => `User prefers ${m[1].trim()}` },
  { regex: /my goal is\s+(.+)/i, type: "goal", extract: (m: string[]) => `User's goal is ${m[1].trim()}` },
  { regex: /i want to\s+(.+)/i, type: "goal", extract: (m: string[]) => `User wants to ${m[1].trim()}` },
  { regex: /আমি (.+) করতে চাই/i, type: "goal", extract: (m: string[]) => `User wants to ${m[1].trim()}` },
  { regex: /remember that\s+(.+)/i, type: "general", extract: (m: string[]) => m[1].trim() },
  { regex: /মনে রাখো?\s+(.+)/i, type: "general", extract: (m: string[]) => m[1].trim() },
];

function detectMemories(text: string): { content: string; type: string }[] {
  const memories: { content: string; type: string }[] = [];
  for (const pattern of MEMORY_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      memories.push({ content: pattern.extract(match), type: pattern.type });
      break;
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

    // 2. Build memory context
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
      memoryBlock = `\n\n--- USER MEMORIES ---\nUse these memories to personalize your responses naturally.\n\n${sections}\n--- END MEMORIES ---`;
    }

    const systemPrompt = BASE_SYSTEM_PROMPT + memoryBlock;

    // 3. Detect and store new memories
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === "user") {
      const detected = detectMemories(lastUserMsg.content);
      for (const mem of detected) {
        await supabase.from("memories").insert(mem);
      }
    }

    // 4. First pass: non-streaming call with tool calling to detect commands
    const classifyResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          tools: [COMMAND_TOOL],
          stream: false,
        }),
      }
    );

    if (!classifyResponse.ok) {
      if (classifyResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (classifyResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const classifyData = await classifyResponse.json();
    const choice = classifyData.choices?.[0];

    // Check if the AI decided to call the command tool
    if (choice?.message?.tool_calls?.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      if (toolCall.function?.name === "execute_command") {
        const args = JSON.parse(toolCall.function.arguments);
        // Return command JSON + a friendly message
        const commandResponse = {
          type: "command",
          action: args.action,
          target: args.target,
          data: args.data || null,
          message: choice.message.content || `ঠিক আছে Boss, ${args.action === "search" ? `"${args.data}" সার্চ করছি` : `${args.target} খুলছি`}! 🚀`,
        };
        return new Response(JSON.stringify(commandResponse), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 5. Normal chat — stream the response
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
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
