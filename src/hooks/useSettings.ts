import { useState, useEffect } from "react";

export interface SweetySettings {
  voiceSpeed: number;
  voicePitch: number;
  theme: "dark" | "midnight" | "amoled";
  autoSpeak: boolean;
  language: "auto" | "en" | "bn";
}

const DEFAULT_SETTINGS: SweetySettings = {
  voiceSpeed: 1,
  voicePitch: 1.1,
  theme: "dark",
  autoSpeak: true,
  language: "auto",
};

export function useSettings() {
  const [settings, setSettings] = useState<SweetySettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    const saved = localStorage.getItem("sweety-settings");
    if (saved) {
      try { return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }; } catch { /* ignore */ }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem("sweety-settings", JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof SweetySettings>(key: K, value: SweetySettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return { settings, updateSetting };
}
