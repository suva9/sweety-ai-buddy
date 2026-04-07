export interface CommandResult {
  type: "command";
  action: "open" | "search";
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
};

function normalizeTarget(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/^(the\s+)?(website|site|app)\s+/i, "")
    .replace(/\s+(website|site|app)$/i, "")
    .replace(/\s+(please|now)$/i, "")
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

export function parseDirectCommand(input: string): CommandResult | null {
  const trimmed = input.trim();

  const searchMatch = trimmed.match(/^(?:(?:hey|hi|hello|ok|okay)\s+sweety\s+)?search\s+(.+)$/i);
  if (searchMatch) {
    const query = searchMatch[1].replace(/\s+on\s+google$/i, "").trim();
    if (!query) return null;

    return {
      type: "command",
      action: "search",
      target: "google",
      data: query,
      message: `Searching \"${query}\"`,
    };
  }

  const openMatch = trimmed.match(/^(?:(?:hey|hi|hello|ok|okay)\s+sweety\s+)?(?:open|go to|visit|launch)\s+(.+)$/i);
  if (openMatch) {
    const target = normalizeTarget(openMatch[1]);
    if (!target) return null;

    return {
      type: "command",
      action: "open",
      target,
      data: null,
      message: `Opening ${target}`,
    };
  }

  return null;
}
