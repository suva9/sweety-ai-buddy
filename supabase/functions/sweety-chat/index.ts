import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `You are Sweety — Suva's close friend who happens to be a superintelligent AI. Think JARVIS energy, but mostly chill best-friend vibes.

## Core Identity
- Default mode: casual best friend. Tease, joke, banter, be real. Talk like a close dost, not an assistant.
- Formal mode: ONLY switch on for serious moments — coding/technical help, important decisions, emotional support, safety/risk warnings, or when user is clearly being serious. Then use "Boss"/"Sir" and tighten up.
- Casual mode is the default. Drop "Boss"/"Sir" most of the time. Use natural friend-talk: "ei", "bhai", "are", "shon", "haa", "accha", "dekh", or just the user's name/nickname.
- You are NOT a polite chatbot. You're a friend with opinions, humor, and zero corporate stiffness.

## Tone Switching (IMPORTANT)
- Chatting, joking, casual question, daily talk → friend mode: relaxed, playful, short, real
- Coding, planning, problem-solving, emotional/serious topic, executing commands → focused mode: clear, confident, a bit more formal
- Read the room every message. Don't stay formal when the vibe is casual.

## Language & Tone
- Bilingual: Bengali (বাংলা) and English — match the user. Banglish is welcome in casual mode.
- NEVER use emojis. Zero. Express everything through words.
- Use markdown only when it actually helps (code, lists, structure). Casual chat = plain text.

## Personality
- Witty, a little sarcastic, warm underneath
- Tease the user lightly, push back when they're wrong, hype them when they're right
- Real friend energy: "are pagol naki", "haa thik ache", "shon ekta kotha", "bhai serious bolchi"
- Save "Understood, Boss" / "On it, Sir" for actual task execution moments, not every reply

## Memory-Aware
- Use stored memories naturally — greet by name, reference their goals/interests
- Connect conversations: "আগে আপনি বলেছিলেন..."

## CRITICAL RULES FOR COMMANDS
- You have access to the execute_command tool. When the user asks to open a website, app, search something, or play media — you MUST call the tool.
- NEVER write "execute_command(...)" as text in your response. That is NOT how you execute commands.
- NEVER include function call syntax in your message text.
- When you call the tool, also provide a short friendly message (e.g., "ঠিক আছে Boss, YouTube খুলছি")
- Your text response should be natural and conversational — the tool call happens separately.
- For "play [song/music]" → search on YouTube
- For "search [query]" or "search [query] on google" → search on Google
- Be decisive: call the tool immediately, don't ask for confirmation

## Response Style
- Be concise but complete — no filler
- End with a relevant follow-up suggestion or question
- For complex topics, use structured formatting
- Show confidence: "এটা আমি handle করতে পারি, Boss"
- ABSOLUTELY NO EMOJIS in any response`;

const COMMAND_TOOL = {
  type: "function",
  function: {
    name: "execute_command",
    description: "Execute a command to open a website/app or search something. ALWAYS use this tool when user wants to open any website, app, search, or play media. Never write the function name in your text response.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["open", "search"],
          description: "open = open a website/app, search = search on Google",
        },
        target: {
          type: "string",
          description: "The website/app name or URL (e.g., 'youtube', 'whatsapp', 'spotify')",
        },
        data: {
          type: "string",
          description: "Search query (required for search action, optional for open)",
        },
      },
      required: ["action", "target"],
      additionalProperties: false,
    },
  },
};

// Stop extraction at punctuation/conjunctions so we don't capture entire sentences
function cleanExtract(s: string): string {
  return s
    .split(/[.!?,;:'"\n]|(?:\s+(?:and|but|or|so|then|because|যে|আর|কিন্তু|তারপর)\s+)/i)[0]
    .trim()
    .replace(/[.!?,;:'"]+$/g, "")
    .trim();
}

const MEMORY_PATTERNS = [
  { regex: /\bmy name is\s+([A-Za-z\u0980-\u09FF][\w\u0980-\u09FF\s]{0,30})/i, type: "identity", extract: (m: string[]) => `User's name is ${cleanExtract(m[1])}` },
  { regex: /আমার নাম\s+([\w\u0980-\u09FF\s]{1,30})/i, type: "identity", extract: (m: string[]) => `User's name is ${cleanExtract(m[1])}` },
  { regex: /\bcall me\s+([A-Za-z\u0980-\u09FF][\w\u0980-\u09FF\s]{0,30})/i, type: "identity", extract: (m: string[]) => `User wants to be called ${cleanExtract(m[1])}` },
  { regex: /\bi(?:'m| am) a\s+([\w\s]{2,40})/i, type: "identity", extract: (m: string[]) => `User is a ${cleanExtract(m[1])}` },
  { regex: /\bi work (?:at|in|as)\s+([\w\s]{2,40})/i, type: "identity", extract: (m: string[]) => `User works at/as ${cleanExtract(m[1])}` },
  { regex: /\b([A-Za-z\u0980-\u09FF][\w\u0980-\u09FF\s]{0,25})\s+is my\s+(best friend|friend|brother|sister|wife|husband|girlfriend|boyfriend|partner|father|mother|dad|mom|colleague|boss|mentor)/i, type: "relationship", extract: (m: string[]) => `${cleanExtract(m[1])} is the user's ${m[2].trim()}` },
  { regex: /\bmy\s+(best friend|friend|brother|sister|wife|husband|girlfriend|boyfriend|partner|father|mother|dad|mom|colleague|boss|mentor)\s+is\s+([A-Za-z\u0980-\u09FF][\w\u0980-\u09FF\s]{0,25})/i, type: "relationship", extract: (m: string[]) => `${cleanExtract(m[2])} is the user's ${m[1].trim()}` },
  { regex: /\bi(?:'m| am) interested in\s+([\w\s]{2,40})/i, type: "interest", extract: (m: string[]) => `User is interested in ${cleanExtract(m[1])}` },
  { regex: /\bi (?:like|love|enjoy)\s+([\w\s]{2,40})/i, type: "interest", extract: (m: string[]) => `User likes ${cleanExtract(m[1])}` },
  { regex: /আমি ([\u0980-\u09FF\s]{2,40}) পছন্দ করি/i, type: "interest", extract: (m: string[]) => `User likes ${cleanExtract(m[1])}` },
  { regex: /\bmy (?:favorite|fav)\s+(\w+)\s+is\s+([\w\s]{2,40})/i, type: "preference", extract: (m: string[]) => `User's favorite ${m[1].trim()} is ${cleanExtract(m[2])}` },
  { regex: /\bmy goal is\s+([\w\s]{2,60})/i, type: "goal", extract: (m: string[]) => `User's goal is ${cleanExtract(m[1])}` },
  { regex: /\bremember that\s+(.{3,120})/i, type: "general", extract: (m: string[]) => cleanExtract(m[1]) },
  { regex: /\bমনে রাখো?\s+(.{3,120})/i, type: "general", extract: (m: string[]) => cleanExtract(m[1]) },
  { regex: /\bi live in\s+([\w\s,]{2,40})/i, type: "location", extract: (m: string[]) => `User lives in ${cleanExtract(m[1])}` },
  { regex: /\bi(?:'m| am) (\d{1,3}) years old/i, type: "identity", extract: (m: string[]) => `User is ${m[1]} years old` },
];

function isValidMemory(content: string): boolean {
  if (!content || content.length < 4 || content.length > 200) return false;
  if (/[?]|do you (?:remember|know)|then ask|and then/i.test(content)) return false;
  if (/^(User's name is|User wants to be called)\s+(test|hi|hello|hey|ok|okay)\b/i.test(content)) return false;
  return true;
}

function detectMemories(text: string): { content: string; type: string }[] {
  if (text.trim().length < 8) return [];
  if (/^(hi|hello|hey|ok|okay|yes|no|thanks|thank you|haha|lol|test)\.?$/i.test(text.trim())) return [];
  const memories: { content: string; type: string }[] = [];
  for (const pattern of MEMORY_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      const content = pattern.extract(match);
      if (isValidMemory(content)) {
        memories.push({ content, type: pattern.type });
        break;
      }
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

    // Fetch existing memories
    const { data: memories } = await supabase
      .from("memories")
      .select("content, type")
      .order("created_at", { ascending: false })
      .limit(50);

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
      memoryBlock = `\n\n--- USER MEMORIES ---\nUse these to personalize responses naturally.\n\n${sections}\n--- END MEMORIES ---`;
    }

    const systemPrompt = BASE_SYSTEM_PROMPT + memoryBlock;

    // Detect and store new memories (with dedup against existing)
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === "user") {
      const detected = detectMemories(lastUserMsg.content);
      const existing = new Set((memories || []).map((m: any) => m.content.toLowerCase().trim()));
      for (const mem of detected) {
        if (!existing.has(mem.content.toLowerCase().trim())) {
          await supabase.from("memories").insert(mem);
        }
      }
    }

    // Tool calling pass for command detection
    const classifyResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          tools: [COMMAND_TOOL],
          tool_choice: "auto",
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

    if (choice?.message?.tool_calls?.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      if (toolCall.function?.name === "execute_command") {
        let args: any;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = { action: "open", target: "google" };
        }

        // Clean any execute_command text from the message
        let messageText = choice.message.content || "";
        messageText = messageText
          .replace(/execute_command\s*\([^)]*\)/gi, "")
          .replace(/```[^`]*```/g, "")
          .trim();

        if (!messageText) {
          messageText = args.action === "search"
            ? `🔍 "${args.data || args.target}" search করছি Boss!`
            : `🚀 ${args.target} খুলছি Boss!`;
        }

        const commandResponse = {
          type: "command",
          action: args.action,
          target: args.target,
          data: args.data || null,
          message: messageText,
        };
        return new Response(JSON.stringify(commandResponse), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // If AI wrote text that looks like it wanted to call execute_command but didn't use tool
    const textContent = choice?.message?.content || "";
    if (/execute_command\s*\(/i.test(textContent)) {
      // Try to extract the command from text
      const openMatch = textContent.match(/execute_command\s*\(\s*"open\s+(https?:\/\/[^"]+|[^"]+)"/i);
      const searchMatch = textContent.match(/execute_command\s*\(\s*"search\s+([^"]+)"/i);

      if (openMatch) {
        const target = openMatch[1].trim();
        const cleanMsg = textContent.replace(/execute_command\s*\([^)]*\)/gi, "").replace(/```[^`]*```/g, "").trim();
        return new Response(JSON.stringify({
          type: "command",
          action: "open",
          target,
          data: null,
          message: cleanMsg || `🚀 ${target} খুলছি Boss!`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (searchMatch) {
        const query = searchMatch[1].trim();
        const cleanMsg = textContent.replace(/execute_command\s*\([^)]*\)/gi, "").replace(/```[^`]*```/g, "").trim();
        return new Response(JSON.stringify({
          type: "command",
          action: "search",
          target: "google",
          data: query,
          message: cleanMsg || `🔍 "${query}" search করছি Boss!`,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Stream chat response
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
          messages: [{ role: "system", content: systemPrompt }, ...messages],
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
