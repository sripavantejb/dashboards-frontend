/// <reference types="vitest/config" />
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function phoneCallBridge(): Plugin {
  return {
    name: 'phone-call-bridge',
    configureServer: startPhoneCallBridge,
    configurePreviewServer: startPhoneCallBridge,
  };
}

function startPhoneCallBridge() {
  if (process.platform !== 'win32') return;
  const script = path.resolve(import.meta.dirname, 'scripts/one-click-call.ps1');
  if (!existsSync(script)) return;
  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', script],
    { detached: true, stdio: 'ignore', windowsHide: true },
  );
  child.unref();
}

export default defineConfig({
  plugins: [react(), phoneCallBridge()],
  // NEXT_PUBLIC_* keeps env vars from the former Next.js deployment working.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    port: 3000,
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    pool: 'threads',
  },
});
