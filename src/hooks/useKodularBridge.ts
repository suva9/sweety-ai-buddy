import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    AppInventor?: {
      setWebViewString: (value: string) => void;
      getWebViewString: () => string;
    };
  }
}

const APP_COMMANDS: Record<string, string> = {
  whatsapp: "whatsapp",
  facebook: "facebook",
  youtube: "youtube",
  chrome: "chrome",
  camera: "camera",
  gallery: "gallery",
  settings: "settings",
  calculator: "calculator",
  clock: "clock",
  calendar: "calendar",
  maps: "maps",
  gmail: "gmail",
  telegram: "telegram",
  instagram: "instagram",
  spotify: "spotify",
  phone: "phone",
  contacts: "contacts",
  flashlight: "flashlight",
};

export function useKodularBridge() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    setIsConnected(!!window.AppInventor);
  }, []);

  const sendCommand = useCallback((command: string) => {
    if (window.AppInventor) {
      window.AppInventor.setWebViewString(command);
      return true;
    }
    return false;
  }, []);

  const parseAndExecute = useCallback(
    (text: string): string | null => {
      const lower = text.toLowerCase();
      for (const [keyword, command] of Object.entries(APP_COMMANDS)) {
        if (lower.includes(keyword) && (lower.includes("open") || lower.includes("খোলো") || lower.includes("চালাও"))) {
          const sent = sendCommand(command);
          return sent ? command : null;
        }
      }
      // Generic command passthrough
      if (lower.includes("kodular:")) {
        const cmd = text.split("kodular:")[1]?.trim();
        if (cmd) {
          sendCommand(cmd);
          return cmd;
        }
      }
      return null;
    },
    [sendCommand]
  );

  return { isConnected, sendCommand, parseAndExecute };
}
