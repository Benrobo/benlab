type Level = "info" | "warn" | "error";

const output = { info: console.log, warn: console.warn, error: console.error };

function write(level: Level, scope: string, message: string, details?: unknown) {
  const line = `${new Date().toISOString()} [${level}] [${scope}] ${message}`;
  if (details === undefined) output[level](line);
  else output[level](line, details instanceof Error ? (details.stack ?? details.message) : details);
}

export function createLogger(scope: string) {
  return {
    info: (message: string, details?: unknown) => write("info", scope, message, details),
    warn: (message: string, details?: unknown) => write("warn", scope, message, details),
    error: (message: string, details?: unknown) => write("error", scope, message, details),
  };
}
