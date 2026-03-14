import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    const TYPECAST_API_KEY = Deno.env.get("TYPECAST_API_KEY");
    if (!TYPECAST_API_KEY) throw new Error("TYPECAST_API_KEY is not configured");

    const voiceId = "tc_63edf3e806ab09dfc7719403";

    // Clean text for speech (strip markdown)
    const clean = text
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

    // Call Typecast TTS API
    const ttsResponse = await fetch("https://api.typecast.ai/v1/text-to-speech", {
      method: "POST",
      headers: {
        "X-API-KEY": TYPECAST_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voice_id: voiceId,
        text: clean,
        model: "ssfm-v21",
        language: /[\u0980-\u09FF]/.test(clean) ? "ben" : "eng",
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("Typecast API error:", ttsResponse.status, errorText);
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
