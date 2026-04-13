import { motion } from "framer-motion";
import { X, Volume2, Palette, Globe, Zap } from "lucide-react";
import type { SweetySettings } from "@/hooks/useSettings";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: SweetySettings;
  onUpdate: <K extends keyof SweetySettings>(key: K, value: SweetySettings[K]) => void;
}

const SweetySettings = ({ open, onClose, settings, onUpdate }: SettingsPanelProps) => {
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-md mx-4 mb-4 sm:mb-0 glass-strong rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="font-display text-base font-semibold text-foreground">Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Voice Speed */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              <label className="font-display text-sm font-medium text-foreground">Voice Speed</label>
              <span className="ml-auto font-mono text-xs text-muted-foreground">{settings.voiceSpeed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.voiceSpeed}
              onChange={(e) => onUpdate("voiceSpeed", parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full bg-secondary appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Voice Pitch */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-accent" />
              <label className="font-display text-sm font-medium text-foreground">Voice Pitch</label>
              <span className="ml-auto font-mono text-xs text-muted-foreground">{settings.voicePitch.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.voicePitch}
              onChange={(e) => onUpdate("voicePitch", parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full bg-secondary appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Auto Speak Toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-display text-sm font-medium text-foreground">Auto-speak responses</span>
            </div>
            <button
              onClick={() => onUpdate("autoSpeak", !settings.autoSpeak)}
              className={`w-11 h-6 rounded-full transition-colors ${
                settings.autoSpeak ? "bg-primary" : "bg-secondary"
              } relative`}
            >
              <motion.div
                className="w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5"
                animate={{ left: settings.autoSpeak ? "22px" : "2px" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* Theme */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <label className="font-display text-sm font-medium text-foreground">Theme</label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "dark", label: "Dark", preview: "bg-[hsl(220,15%,10%)]" },
                { value: "midnight", label: "Midnight", preview: "bg-[hsl(230,20%,8%)]" },
                { value: "amoled", label: "AMOLED", preview: "bg-black" },
              ] as const).map(({ value, label, preview }) => (
                <button
                  key={value}
                  onClick={() => onUpdate("theme", value)}
                  className={`px-3 py-2.5 rounded-xl border transition-all font-display text-xs ${
                    settings.theme === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/30 text-muted-foreground hover:border-border"
                  }`}
                >
                  <div className={`w-full h-3 rounded-md mb-1.5 ${preview}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <label className="font-display text-sm font-medium text-foreground">Language</label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: "auto", label: "Auto" },
                { value: "en", label: "English" },
                { value: "bn", label: "বাংলা" },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onUpdate("language", value)}
                  className={`px-3 py-2 rounded-xl border transition-all font-display text-xs ${
                    settings.language === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/30 text-muted-foreground hover:border-border"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SweetySettings;
