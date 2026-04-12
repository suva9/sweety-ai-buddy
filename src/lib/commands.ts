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
    const timeLeft = battery.dischargingTime && battery.dischargingTime !== Infinity
      ? `\n⏱️ **আর প্রায়:** ${Math.round(battery.dischargingTime / 60)} মিনিট`
      : "";
    return `${icon} **Battery:** ${level}% — ${charging}${timeLeft}`;
  });
}

function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  const platform = navigator.platform || "Unknown";
  const lang = navigator.language;
  const cores = navigator.hardwareConcurrency || "Unknown";
  const online = navigator.onLine ? "🟢 Online" : "🔴 Offline";
  const memory = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : "Unknown";
  const screenW = screen.width;
  const screenH = screen.height;
  const pixelRatio = window.devicePixelRatio;
  const connection = (navigator as any).connection;
  const netInfo = connection ? `${connection.effectiveType || "unknown"} (${connection.downlink || "?"}Mbps)` : "Unknown";

  return `📱 **Device Info:**\n- **Platform:** ${platform}\n- **Language:** ${lang}\n- **CPU Cores:** ${cores}\n- **RAM:** ${memory}\n- **Screen:** ${screenW}×${screenH} @${pixelRatio}x\n- **Network:** ${netInfo}\n- **Status:** ${online}\n- **User Agent:** \`${ua.slice(0, 100)}...\``;
}

function getNetworkInfo(): string {
  const connection = (navigator as any).connection;
  if (!connection) return "📶 Network info এই browser এ available নেই।";
  const type = connection.effectiveType || "unknown";
  const downlink = connection.downlink || "?";
  const rtt = connection.rtt || "?";
  const saveData = connection.saveData ? "হ্যাঁ" : "না";
  return `📶 **Network Info:**\n- **Type:** ${type}\n- **Speed:** ${downlink} Mbps\n- **Latency:** ${rtt}ms\n- **Data Saver:** ${saveData}\n- **Online:** ${navigator.onLine ? "✅ হ্যাঁ" : "❌ না"}`;
}

function getStorageInfo(): Promise<string> {
  if (!navigator.storage?.estimate) return Promise.resolve("💾 Storage info available নেই।");
  return navigator.storage.estimate().then((est) => {
    const used = ((est.usage || 0) / (1024 * 1024)).toFixed(1);
    const total = ((est.quota || 0) / (1024 * 1024)).toFixed(0);
    return `💾 **Storage:**\n- **Used:** ${used} MB\n- **Available:** ${total} MB`;
  });
}

function getScreenInfo(): string {
  const w = screen.width;
  const h = screen.height;
  const avW = screen.availWidth;
  const avH = screen.availHeight;
  const colorDepth = screen.colorDepth;
  const orientation = screen.orientation?.type || "unknown";
  const pixelRatio = window.devicePixelRatio;
  return `🖥️ **Screen Info:**\n- **Resolution:** ${w}×${h}\n- **Available:** ${avW}×${avH}\n- **Color Depth:** ${colorDepth}bit\n- **Orientation:** ${orientation}\n- **Pixel Ratio:** ${pixelRatio}x`;
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

async function getLocation(): Promise<string> {
  if (!navigator.geolocation) return "📍 Location এই browser এ available নেই।";
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        resolve(`📍 **Your Location:**\n- **Latitude:** ${latitude.toFixed(5)}\n- **Longitude:** ${longitude.toFixed(5)}\n- **Accuracy:** ${Math.round(accuracy)}m\n\n[📌 Google Maps এ দেখুন](https://www.google.com/maps?q=${latitude},${longitude})`);
      },
      (err) => resolve(`📍 Location access denied: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

function doVibrate(): string {
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 100, 50, 200]);
    return "📳 Vibration sent! Boss, feel করলেন?";
  }
  return "📳 Vibration এই device এ support করে না।";
}

function toggleFullscreen(): string {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
    return "🖥️ Fullscreen mode activated! Exit করতে আবার বলুন।";
  } else {
    document.exitFullscreen?.();
    return "🖥️ Fullscreen mode exit করলাম!";
  }
}

async function shareContent(): Promise<string> {
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Sweety AI Assistant",
        text: "Check out Sweety — my personal AI assistant! 🚀",
        url: window.location.href,
      });
      return "📤 Share dialog opened!";
    } catch {
      return "📤 Share cancelled.";
    }
  }
  try {
    await navigator.clipboard.writeText(window.location.href);
    return "📋 Link copied to clipboard! (Share API not available)";
  } catch {
    return "📤 Share not supported on this browser.";
  }
}

async function copyToClipboard(text: string): Promise<string> {
  try {
    await navigator.clipboard.writeText(text);
    return `📋 Copied to clipboard: "${text.slice(0, 50)}${text.length > 50 ? "..." : ""}"`;
  } catch {
    return "📋 Clipboard access denied.";
  }
}

function getColorScheme(): string {
  const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return `🎨 Device color scheme: **${isDark ? "Dark Mode 🌙" : "Light Mode ☀️"}**`;
}

// ─── Reminder / Timer ────────────────────────
const activeReminders: { id: number; label: string; timeoutId: ReturnType<typeof setTimeout> }[] = [];
let reminderIdCounter = 1;

function parseTimeInput(input: string): number | null {
  // "5 min", "10 minutes", "1 hour", "30 sec", "2 ঘণ্টা", "৫ মিনিট"
  const banglaDigits: Record<string, string> = { "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9" };
  let normalized = input;
  for (const [bn, en] of Object.entries(banglaDigits)) {
    normalized = normalized.replace(new RegExp(bn, "g"), en);
  }

  const match = normalized.match(/(\d+)\s*(sec|second|সেকেন্ড|min|minute|মিনিট|hour|ঘণ্টা|hr)/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (/^(sec|second|সেকেন্ড)/.test(unit)) return num * 1000;
  if (/^(min|minute|মিনিট)/.test(unit)) return num * 60 * 1000;
  if (/^(hour|hr|ঘণ্টা)/.test(unit)) return num * 3600 * 1000;
  return null;
}

function setReminder(input: string): string {
  const ms = parseTimeInput(input);
  if (!ms) return "⏰ Boss, সময়টা বুঝতে পারলাম না। এভাবে বলুন: 'remind me in 5 minutes to drink water'";

  // Extract the reminder text
  const textMatch = input.match(/(?:to|that|for|জন্য|করতে)\s+(.+)$/i);
  const label = textMatch ? textMatch[1].trim() : "Reminder";

  const id = reminderIdCounter++;
  const minutes = Math.round(ms / 60000);
  const display = minutes >= 60 ? `${Math.round(minutes / 60)} ঘণ্টা` : `${minutes} মিনিট`;

  const timeoutId = setTimeout(() => {
    // Show notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("⏰ Sweety Reminder", { body: label, icon: "/placeholder.svg" });
    }
    // Also vibrate
    navigator.vibrate?.([200, 100, 200, 100, 300]);

    // Dispatch custom event so SweetyInterface can show the reminder in chat
    window.dispatchEvent(new CustomEvent("sweety-reminder", { detail: { id, label } }));
  }, ms);

  activeReminders.push({ id, label, timeoutId });

  // Request notification permission
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  return `⏰ **Reminder set!**\n\n📝 **"${label}"**\n⏱️ **${display} পর** মনে করাবো Boss!\n\nRelax করুন, আমি ঠিক সময়ে জানাবো! 🔔`;
}

function setTimer(input: string): string {
  const ms = parseTimeInput(input);
  if (!ms) return "⏱️ Boss, সময়টা বুঝতে পারলাম না। এভাবে বলুন: 'set timer 5 minutes'";

  const id = reminderIdCounter++;
  const minutes = Math.round(ms / 60000);
  const seconds = Math.round(ms / 1000);
  const display = minutes >= 1 ? `${minutes} মিনিট` : `${seconds} সেকেন্ড`;

  const timeoutId = setTimeout(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("⏱️ Timer Done!", { body: `${display} timer শেষ হয়েছে Boss!`, icon: "/placeholder.svg" });
    }
    navigator.vibrate?.([300, 100, 300, 100, 500]);
    window.dispatchEvent(new CustomEvent("sweety-reminder", { detail: { id, label: `⏱️ Timer (${display}) শেষ!` } }));
  }, ms);

  activeReminders.push({ id, label: `Timer ${display}`, timeoutId });

  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }

  return `⏱️ **Timer set: ${display}!**\n\nBoss, সময় হলেই জানাবো! 🔔`;
}

function getActiveReminders(): string {
  if (activeReminders.length === 0) return "📋 কোনো active reminder নেই Boss।";
  const list = activeReminders.map((r, i) => `${i + 1}. 📝 ${r.label}`).join("\n");
  return `📋 **Active Reminders:**\n\n${list}`;
}

function clearAllReminders(): string {
  for (const r of activeReminders) clearTimeout(r.timeoutId);
  activeReminders.length = 0;
  return "🗑️ সব reminders clear করে দিলাম Boss!";
}

// ─── Quotes & Jokes ──────────────────────────
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
  "Boss, আমি ChatGPT কে বললাম আমাকে হারাতে — সে বললো 'আমি busy, তুমি already won!' 🏆",
];

const FACTS = [
  "🧠 জানেন কি? মানুষের মস্তিষ্ক প্রতিদিন প্রায় ৭০,০০০ thoughts তৈরি করে!",
  "🌍 পৃথিবীতে প্রায় ৭,০০০+ ভাষা আছে — আর আমি Boss এর ভাষা সবচেয়ে ভালো বুঝি! 😄",
  "🚀 আলোর গতিতে চললে আপনি ১ সেকেন্ডে পৃথিবী ৭.৫ বার ঘুরতে পারবেন!",
  "🐙 অক্টোপাসের ৩টা হৃদপিণ্ড আছে — আর আমার ০টা, তবুও Boss এর জন্য ভালোবাসা আছে! ❤️",
  "🧬 মানুষের DNA এর ৯৯.৯% একই — তবে Boss unique! ✨",
  "🌙 চাঁদ প্রতি বছর পৃথিবী থেকে ৩.৮ সেমি দূরে সরে যাচ্ছে!",
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

/** Strip any execute_command() text that AI accidentally put in response */
export function cleanAIResponse(text: string): string {
  return text
    .replace(/execute_command\s*\([^)]*\)/gi, "")
    .replace(/```\s*execute_command[^`]*```/gi, "")
    .replace(/`execute_command[^`]*`/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

  // Reminder
  if (/(?:remind|reminder|মনে করাও|মনে করাবে|রিমাইন্ডার)/i.test(lower)) {
    if (/(?:list|show|active|দেখাও|কি কি)/i.test(lower)) return { type: "command", action: "utility", target: "reminder", data: null, message: getActiveReminders() };
    if (/(?:clear|delete|cancel|বাতিল|মুছে দাও)/i.test(lower)) return { type: "command", action: "utility", target: "reminder", data: null, message: clearAllReminders() };
    return { type: "command", action: "utility", target: "reminder", data: null, message: setReminder(trimmed) };
  }

  // Timer
  if (/(?:timer|set timer|টাইমার|countdown)/i.test(lower)) {
    return { type: "command", action: "utility", target: "timer", data: null, message: setTimer(trimmed) };
  }

  // Alarm (treated as timer)
  if (/(?:alarm|অ্যালার্ম|set alarm)/i.test(lower)) {
    return { type: "command", action: "utility", target: "timer", data: null, message: setTimer(trimmed) };
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

  // Network info
  if (/(?:network|internet speed|নেটওয়ার্ক|ইন্টারনেট|wifi|connection info)/i.test(lower)) {
    return { type: "command", action: "utility", target: "network", data: null, message: getNetworkInfo() };
  }

  // Storage info
  if (/(?:storage|memory|স্টোরেজ|মেমোরি|disk space)/i.test(lower)) {
    const info = await getStorageInfo();
    return { type: "command", action: "utility", target: "storage", data: null, message: info };
  }

  // Screen info
  if (/(?:screen info|display|resolution|স্ক্রিন)/i.test(lower)) {
    return { type: "command", action: "utility", target: "screen", data: null, message: getScreenInfo() };
  }

  // Location
  if (/(?:my location|where am i|আমি কোথায়|location|অবস্থান|gps)/i.test(lower)) {
    const info = await getLocation();
    return { type: "command", action: "utility", target: "location", data: null, message: info };
  }

  // Vibrate
  if (/(?:vibrate|ভাইব্রেট|কম্পন)/i.test(lower)) {
    return { type: "command", action: "utility", target: "vibrate", data: null, message: doVibrate() };
  }

  // Fullscreen
  if (/(?:fullscreen|full screen|ফুলস্ক্রিন)/i.test(lower)) {
    return { type: "command", action: "utility", target: "fullscreen", data: null, message: toggleFullscreen() };
  }

  // Share
  if (/(?:share|শেয়ার)/i.test(lower)) {
    const msg = await shareContent();
    return { type: "command", action: "utility", target: "share", data: null, message: msg };
  }

  // Copy to clipboard
  if (/^(?:copy|কপি)\s+(.+)$/i.test(lower)) {
    const match = trimmed.match(/^(?:copy|কপি)\s+(.+)$/i);
    if (match) {
      const msg = await copyToClipboard(match[1]);
      return { type: "command", action: "utility", target: "clipboard", data: null, message: msg };
    }
  }

  // Color scheme / theme
  if (/(?:color scheme|theme|dark mode|light mode|থিম)/i.test(lower)) {
    return { type: "command", action: "utility", target: "theme", data: null, message: getColorScheme() };
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

  // Fun facts
  if (/(?:fact|interesting|জানো কি|মজার তথ্য|fun fact|তথ্য)/i.test(lower)) {
    const fact = FACTS[Math.floor(Math.random() * FACTS.length)];
    return { type: "command", action: "utility", target: "fact", data: null, message: fact };
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

  // Random number
  if (/(?:random number|random|র‍্যান্ডম)/i.test(lower)) {
    const num = Math.floor(Math.random() * 100) + 1;
    return { type: "command", action: "utility", target: "random", data: null, message: `🎯 Random number: **${num}**` };
  }

  // Password generator
  if (/(?:password|generate password|পাসওয়ার্ড)/i.test(lower)) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 16; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    return { type: "command", action: "utility", target: "password", data: null, message: `🔐 **Generated Password:**\n\`${pwd}\`\n\n(16 characters, strong!)` };
  }

  // UUID generator
  if (/(?:uuid|unique id|ইউনিক আইডি)/i.test(lower)) {
    const uuid = crypto.randomUUID();
    return { type: "command", action: "utility", target: "uuid", data: null, message: `🆔 **UUID:** \`${uuid}\`` };
  }

  // Search (with various patterns)
  const searchMatch = trimmed.match(/^(?:(?:hey|hi|hello|ok|okay)\s+sweety\s+)?search\s+(.+?)(?:\s+on\s+google)?$/i);
  if (searchMatch) {
    const query = searchMatch[1].trim();
    if (!query) return null;
    return { type: "command", action: "search", target: "google", data: query, message: `🔍 Searching "${query}"` };
  }

  // "search X on google" variant
  const searchOnMatch = trimmed.match(/^search\s+(.+?)\s+on\s+google$/i);
  if (searchOnMatch) {
    return { type: "command", action: "search", target: "google", data: searchOnMatch[1].trim(), message: `🔍 Google এ "${searchOnMatch[1].trim()}" search করছি` };
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

  // Open (must be near the end to avoid catching other patterns)
  const openMatch = trimmed.match(/^(?:(?:hey|hi|hello|ok|okay)\s+sweety\s+)?(?:open|go to|visit|launch|খোলো|ওপেন)\s+(.+)$/i);
  if (openMatch) {
    const target = normalizeTarget(openMatch[1]);
    if (!target) return null;
    return { type: "command", action: "open", target, data: null, message: `🚀 Opening ${target}` };
  }

  return null;
}
