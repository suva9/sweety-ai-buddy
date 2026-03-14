import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Detect if text contains Bengali characters
function isBengali(text: string): boolean {
  return /[\u0980-\u09FF]/.test(text);
}

// Truncate text to reduce TTS latency — speak only the first ~400 chars
function truncateForSpeech(text: string, maxLen = 400): string {
  if (text.length <= maxLen) return text;
  // Try to cut at a sentence boundary
  const trimmed = text.slice(0, maxLen);
  const lastPeriod = Math.max(
    trimmed.lastIndexOf(". "),
    trimmed.lastIndexOf("। "),
    trimmed.lastIndexOf("? "),
    trimmed.lastIndexOf("! ")
  );
  return lastPeriod > maxLen * 0.3 ? trimmed.slice(0, lastPeriod + 1) : trimmed + "...";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    const TYPECAST_API_KEY = Deno.env.get("TYPECAST_API_KEY");
    if (!TYPECAST_API_KEY) throw new Error("TYPECAST_API_KEY is not configured");

    // Clean text for speech (strip markdown)
    let clean = text
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`{1,3}[^`]*`{1,3}/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[-*]\s/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .trim();

    if (!clean) {
      return new Response(JSON.stringify({ error: "No text to speak" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Truncate for faster response
    clean = truncateForSpeech(clean);

    const bengali = isBengali(clean);
    const language = bengali ? "ben" : "eng";

    // Use v2 API endpoint with language-appropriate voice
    // For Bengali: try the same voice with ben language
    const voiceId = "tc_63edf3e806ab09dfc7719403";

    const ttsResponse = await fetch("https://api.typecast.ai/v2/text-to-speech", {
      method: "POST",
      headers: {
        "X-API-KEY": TYPECAST_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voice_id: voiceId,
        text: clean,
        model: "ssfm-v30",
        language,
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("Typecast v2 API error:", ttsResponse.status, errorText);

      // If Bengali fails on this voice, retry with English
      if (bengali) {
        console.log("Bengali TTS failed, retrying with English...");
        const retryResponse = await fetch("https://api.typecast.ai/v2/text-to-speech", {
          method: "POST",
          headers: {
            "X-API-KEY": TYPECAST_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voice_id: voiceId,
            text: clean,
            model: "ssfm-v30",
            language: "eng",
          }),
        });

        if (retryResponse.ok) {
          const audioBuffer = await retryResponse.arrayBuffer();
          return new Response(audioBuffer, {
            headers: { ...corsHeaders, "Content-Type": "audio/wav" },
          });
        }
        
        // If v2 also fails, try v1 as final fallback
        console.log("v2 retry failed, trying v1...");
        const v1Response = await fetch("https://api.typecast.ai/v1/text-to-speech", {
          method: "POST",
          headers: {
            "X-API-KEY": TYPECAST_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voice_id: voiceId,
            text: clean,
            model: "ssfm-v21",
            language: "eng",
          }),
        });

        if (v1Response.ok) {
          const audioBuffer = await v1Response.arrayBuffer();
          return new Response(audioBuffer, {
            headers: { ...corsHeaders, "Content-Type": "audio/wav" },
          });
        }
      }

      return new Response(
        JSON.stringify({ error: `Typecast API error: ${ttsResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await ttsResponse.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/wav",
      },
    });
  } catch (e) {
    console.error("typecast-tts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
