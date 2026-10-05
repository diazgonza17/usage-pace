export type Reading = { percentUsed: number; resetsAt: string }

declare module 'claude-code' {
  interface PluginState {
    'usage-pace': { fiveHour: Reading | null }
  }
}
