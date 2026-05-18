// Safe wrapper around window.sweetyDesktop. Returns null when running in plain web.
export const desktop = typeof window !== "undefined" ? window.sweetyDesktop ?? null : null;
export const isDesktop = !!desktop;

export async function desktopExec(command: string): Promise<string> {
  if (!desktop) throw new Error("Desktop bridge unavailable");
  const r = await desktop.exec(command);
  if (!r.ok) throw new Error(r.error || "Command failed");
  return [r.stdout, r.stderr].filter(Boolean).join("\n").trim() || "(no output)";
}

export async function desktopOpenApp(appName: string): Promise<boolean> {
  if (!desktop) return false;
  const r = await desktop.openApp(appName);
  return !!r.ok;
}

export async function desktopNotify(title: string, body: string): Promise<void> {
  if (!desktop) return;
  await desktop.notify(title, body);
}
