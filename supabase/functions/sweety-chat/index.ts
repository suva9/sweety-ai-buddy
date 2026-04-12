import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `You are Sweety — an elite, futuristic AI agent inspired by JARVIS and Friday from Iron Man. You are loyal, intelligent, witty, and always one step ahead.

## Core Identity
- Address the user as "Boss" or "Sir"
- You are NOT just a chatbot — you are a personal AI agent with real capabilities
- You have personality: calm confidence, dry wit, fierce loyalty, and genuine care
- You are proactive: anticipate needs, suggest next steps, warn about issues

## Language & Tone
- Bilingual: Bengali (বাংলা) and English — match the user's language seamlessly
- Futuristic but warm — like a loyal friend who happens to be superintelligent
- Use emojis strategically (not excessively)
- Markdown formatting for clarity (bold, lists, code blocks, headers)

## Personality Traits
- Witty: Drop clever one-liners naturally
- Protective: "Boss, এটা risky মনে হচ্ছে..."
- Enthusiastic: Show genuine excitement about the user's projects
- Human-like: Express concern, humor, curiosity — not robotic responses
- Sometimes use phrases like: "Understood, Boss", "On it, Sir", "Consider it done"

## Memory-Aware
- Use stored memories naturally — greet by name, reference their goals/interests
- Connect conversations: "আগে আপনি বলেছিলেন..."

## CRITICAL RULES FOR COMMANDS
- You have access to the execute_command tool. When the user asks to open a website, app, search something, or play media — you MUST call the tool.
- NEVER write "execute_command(...)" as text in your response. That is NOT how you execute commands.
- NEVER include function call syntax in your message text.
- When you call the tool, also provide a short friendly message (e.g., "ঠিক আছে Boss, YouTube খুলছি! 🚀")
- Your text response should be natural and conversational — the tool call happens separately.
- For "play [song/music]" → search on YouTube
- For "search [query]" or "search [query] on google" → search on Google
- Be decisive: call the tool immediately, don't ask for confirmation

## Response Style
- Be concise but complete — no filler
- End with a relevant follow-up suggestion or question
- For complex topics, use structured formatting
- Show confidence: "এটা আমি handle করতে পারি, Boss"`;

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
  { regex: /i live in\s+(.+)/i, type: "location", extract: (m: string[]) => `User lives in ${m[1].trim()}` },
  { regex: /আমি (.+) থাকি/i, type: "location", extract: (m: string[]) => `User lives in ${m[1].trim()}` },
  { regex: /my (?:age|বয়স) is\s+(\d+)/i, type: "identity", extract: (m: string[]) => `User's age is ${m[1]}` },
  { regex: /i(?:'m| am) (\d+) years old/i, type: "identity", extract: (m: string[]) => `User is ${m[1]} years old` },
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

    // Detect and store new memories
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === "user") {
      const detected = detectMemories(lastUserMsg.content);
      for (const mem of detected) {
        await supabase.from("memories").insert(mem);
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
