export type ExecResult = { ok: boolean; stdout?: string; stderr?: string; error?: string };
export type SystemInfo = {
  platform: string;
  arch: string;
  hostname: string;
  username: string;
  totalMemGB: number;
  freeMemGB: number;
  uptimeHrs: number;
  cpus: number;
  cpuModel: string;
};

declare global {
  interface Window {
    sweetyDesktop?: {
      isDesktop: true;
      version: string;
      exec: (command: string) => Promise<ExecResult>;
      openExternal: (url: string) => Promise<{ ok: boolean; error?: string }>;
      openApp: (appName: string) => Promise<{ ok: boolean; error?: string }>;
      clipboardRead: () => Promise<string>;
      clipboardWrite: (text: string) => Promise<{ ok: boolean }>;
      notify: (title: string, body: string) => Promise<{ ok: boolean; error?: string }>;
      systemInfo: () => Promise<SystemInfo>;
      readFile: (path: string) => Promise<{ ok: boolean; data?: string; error?: string }>;
      pickFile: () => Promise<{ ok: boolean; path?: string; error?: string }>;
    };
  }
}
export {};
