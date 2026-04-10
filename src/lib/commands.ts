export interface CommandResult {
  type: "command";
  action: "open" | "search" | "utility";
  target: string;
  data: string | null;
  message: string;
}

const URL_MAP: Record<string, string> = {
  youtube: "https://www.youtube.com",
  whatsapp: "https://web.whatsapp.com",
  google: "https://www.google.com",
  facebook: "https://www.facebook.com",
  gmail: "https://mail.google.com",
  maps: "https://maps.google.com",
  twitter: "https://twitter.com",
  x: "https://twitter.com",
  instagram: "https://www.instagram.com",
  github: "https://github.com",
  spotify: "https://open.spotify.com",
  netflix: "https://www.netflix.com",
  telegram: "https://web.telegram.org",
  linkedin: "https://www.linkedin.com",
  reddit: "https://www.reddit.com",
  tiktok: "https://www.tiktok.com",
  pinterest: "https://www.pinterest.com",
  amazon: "https://www.amazon.com",
  chatgpt: "https://chat.openai.com",
  drive: "https://drive.google.com",
  docs: "https://docs.google.com",
  sheets: "https://sheets.google.com",
  calendar: "https://calendar.google.com",
  notion: "https://www.notion.so",
  figma: "https://www.figma.com",
  canva: "https://www.canva.com",
  discord: "https://discord.com",
  stackoverflow: "https://stackoverflow.com",
};

function normalizeTarget(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/^(the\s+)?(website|site|app|page)\s+/i, "")
    .replace(/\s+(website|site|app|page)$/i, "")
    .replace(/\s+(please|now|for me|bro|boss)$/i, "")
    .replace(/[.!?]+$/g, "")
    .trim();
}

function buildOpenUrl(target: string) {
  const normalized = normalizeTarget(target).replace(/\s+/g, "");
  if (/^https?:\/\//i.test(target)) return target;
  if (URL_MAP[normalized]) return URL_MAP[normalized];
  if (/^[\w-]+\.[a-z]{2,}(\/.*)?$/i.test(normalized)) return `https://${normalized}`;
  return `https://${normalized}.com`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "🌙 রাত গভীর হয়েছে Boss, কিছু দরকার?";
  if (hour < 12) return "🌅 সুপ্রভাত Boss! আজকের দিনটা দারুণ হবে!";
  if (hour < 17) return "☀️ শুভ দুপুর Boss! কাজকর্ম কেমন চলছে?";
  if (hour < 20) return "🌆 শুভ সন্ধ্যা Boss! আজকের দিনটা কেমন গেলো?";
  return "🌙 শুভ রাত্রি Boss! কিছু help লাগবে?";
}

function getCurrentTime(): string {
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const date = now.toLocaleDateString("bn-BD", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return `🕐 **সময়:** ${time}\n📅 **তারিখ:** ${date}`;
}

function getBatteryInfo(): Promise<string> {
  if (!("getBattery" in navigator)) return Promise.resolve("🔋 Battery info এই browser এ available নেই।");
  return (navigator as any).getBattery().then((battery: any) => {
    const level = Math.round(battery.level * 100);
    const charging = battery.charging ? "⚡ চার্জ হচ্ছে" : "🔋 চার্জ হচ্ছে না";
    const icon = level > 80 ? "🟢" : level > 40 ? "🟡" : "🔴";
    return `${icon} **Battery:** ${level}% — ${charging}`;
  });
}

function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  const platform = navigator.platform || "Unknown";
  const lang = navigator.language;
  const cores = navigator.hardwareConcurrency || "Unknown";
  const online = navigator.onLine ? "🟢 Online" : "🔴 Offline";
  const memory = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : "Unknown";

  return `📱 **Device Info:**\n- **Platform:** ${platform}\n- **Language:** ${lang}\n- **CPU Cores:** ${cores}\n- **RAM:** ${memory}\n- **Status:** ${online}\n- **User Agent:** \`${ua.slice(0, 80)}...\``;
}

function calculate(expression: string): string | null {
  const cleaned = expression.replace(/[^0-9+\-*/.()% ]/g, "").trim();
  if (!cleaned || cleaned.length > 100) return null;
  try {
    const result = new Function(`return (${cleaned})`)();
    if (typeof result === "number" && isFinite(result)) {
      return `🧮 **${expression}** = **${result}**`;
    }
    return null;
  } catch {
    return null;
  }
}

const MOTIVATIONAL_QUOTES = [
  "\"The only way to do great work is to love what you do.\" — Steve Jobs",
  "\"Success is not final, failure is not fatal: It is the courage to continue that counts.\" — Winston Churchill",
  "\"Believe you can and you're halfway there.\" — Theodore Roosevelt",
  "\"It does not matter how slowly you go as long as you do not stop.\" — Confucius",
  "\"The future belongs to those who believe in the beauty of their dreams.\" — Eleanor Roosevelt",
  "\"Your time is limited, don't waste it living someone else's life.\" — Steve Jobs",
  "\"Strive not to be a success, but rather to be of value.\" — Albert Einstein",
  "\"In the middle of difficulty lies opportunity.\" — Albert Einstein",
  "\"The best revenge is massive success.\" — Frank Sinatra",
  "\"Dream big and dare to fail.\" — Norman Vaughan",
];

const JOKES = [
  "Boss, শুনুন — প্রোগ্রামাররা কেন ডার্ক মোড পছন্দ করে? কারণ আলোতে bugs আসে! 🐛😄",
  "AI কে জিজ্ঞেস করলাম — তুমি কি ভালোবাসতে পারো? সে বললো — 404 Love Not Found! 💔😂",
  "WiFi password ভুললে কী হয়? Existential crisis! 😱📶",
  "Boss, জানেন JavaScript এর সবচেয়ে কঠিন অংশ কোনটা? — Undefined relationship! 💀",
  "Python কেন সবচেয়ে friendly language? কারণ সে সবাইকে indent করে welcome করে! 🐍",
];

export function executeCommand(cmd: CommandResult) {
  if (typeof window === "undefined") return;

  if (cmd.action === "search") {
    const query = encodeURIComponent(cmd.data || cmd.target);
    window.open(`https://www.google.com/search?q=${query}`, "_blank", "noopener,noreferrer");
    return;
  }

  if (cmd.action === "open") {
    window.open(buildOpenUrl(cmd.target), "_blank", "noopener,noreferrer");
  }
}

export async function parseDirectCommand(input: string): Promise<CommandResult | null> {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // Time/date
  if (/^(?:what(?:'s| is) the )?(?:time|date|সময়|তারিখ|কয়টা বাজে|সময় কত)/i.test(lower)) {
    return { type: "command", action: "utility", target: "time", data: null, message: getCurrentTime() };
  }

  // Greeting
  if (/^(?:hi|hello|hey|হাই|হ্যালো|কেমন আছ|কি খবর|assalamu|good morning|good evening|good night)/i.test(lower)) {
    return { type: "command", action: "utility", target: "greeting", data: null, message: getGreeting() };
  }

  // Battery
  if (/(?:battery|charge|চার্জ|ব্যাটারি)/i.test(lower)) {
    const info = await getBatteryInfo();
    return { type: "command", action: "utility", target: "battery", data: null, message: info };
  }

  // Device info
  if (/(?:device info|system info|ডিভাইস|সিস্টেম ইনফো|about this device|phone info)/i.test(lower)) {
    return { type: "command", action: "utility", target: "device", data: null, message: getDeviceInfo() };
  }

  // Calculator
  if (/^(?:calculate|calc|হিসাব)\s+(.+)$/i.test(lower)) {
    const match = trimmed.match(/^(?:calculate|calc|হিসাব)\s+(.+)$/i);
    if (match) {
      const result = calculate(match[1]);
      if (result) return { type: "command", action: "utility", target: "calc", data: null, message: result };
    }
  }

  // Direct math expression
  if (/^[\d(][\d+\-*/.()% ]+$/.test(lower)) {
    const result = calculate(trimmed);
    if (result) return { type: "command", action: "utility", target: "calc", data: null, message: result };
  }

  // Motivation
  if (/(?:motivat|inspire|উৎসাহ|মোটিভেশন|motivation|inspire me)/i.test(lower)) {
    const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    return { type: "command", action: "utility", target: "motivation", data: null, message: `💪 **Motivation for you, Boss:**\n\n${quote}` };
  }

  // Jokes
  if (/(?:joke|funny|মজা|জোক|হাসাও|হাসি|মজার কিছু বল)/i.test(lower)) {
    const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
    return { type: "command", action: "utility", target: "joke", data: null, message: joke };
  }

  // Flip a coin
  if (/(?:flip a coin|coin flip|toss|মুদ্রা|heads or tails)/i.test(lower)) {
    const result = Math.random() > 0.5 ? "🪙 **Heads!**" : "🪙 **Tails!**";
    return { type: "command", action: "utility", target: "coin", data: null, message: result };
  }

  // Roll dice
  if (/(?:roll.*dice|dice roll|ডাইস)/i.test(lower)) {
    const result = Math.floor(Math.random() * 6) + 1;
    return { type: "command", action: "utility", target: "dice", data: null, message: `🎲 **${result}** এসেছে!` };
  }

  // Search
  const searchMatch = trimmed.match(/^(?:(?:hey|hi|hello|ok|okay)\s+sweety\s+)?search\s+(.+)$/i);
  if (searchMatch) {
    const query = searchMatch[1].replace(/\s+on\s+google$/i, "").trim();
    if (!query) return null;
    return { type: "command", action: "search", target: "google", data: query, message: `🔍 Searching "${query}"` };
  }

  // Google search shorthand
  const googleMatch = trimmed.match(/^(?:google|গুগল)\s+(.+)$/i);
  if (googleMatch) {
    return { type: "command", action: "search", target: "google", data: googleMatch[1].trim(), message: `🔍 Searching "${googleMatch[1].trim()}"` };
  }

  // YouTube search
  const ytSearchMatch = trimmed.match(/^(?:play|youtube search|yt search|ইউটিউব এ সার্চ)\s+(.+)$/i);
  if (ytSearchMatch) {
    const query = ytSearchMatch[1].trim();
    return {
      type: "command",
      action: "open",
      target: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      data: query,
      message: `▶️ YouTube এ "${query}" search করছি`,
    };
  }

  // Open
  const openMatch = trimmed.match(/^(?:(?:hey|hi|hello|ok|okay)\s+sweety\s+)?(?:open|go to|visit|launch|খোলো|ওপেন)\s+(.+)$/i);
  if (openMatch) {
    const target = normalizeTarget(openMatch[1]);
    if (!target) return null;
    return { type: "command", action: "open", target, data: null, message: `🚀 Opening ${target}` };
  }

  return null;
}
