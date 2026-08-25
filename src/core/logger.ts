// Tipos base compartilhados em todo o framework

export interface Logger {
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
}

export const defaultLogger: Logger = {
  info: (msg, ...args) => console.log(`[aape] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[aape:warn] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[aape:error] ${msg}`, ...args),
};
