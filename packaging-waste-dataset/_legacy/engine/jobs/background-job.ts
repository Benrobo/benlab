import PQueue from "p-queue";
import { createLogger } from "../lib/logger";

type JobOutcome = "done" | "stopped" | "failed";

type JobDefinition<Payload> = {
  id: string;
  concurrency: number;
  maxDurationMs: number;
  key: (payload: Payload) => string;
  run: (payload: Payload, signal: AbortSignal) => Promise<void>;
  onStart?: (payload: Payload) => void;
  onFinish?: (payload: Payload, outcome: JobOutcome) => void;
};

export function defineJob<Payload>(definition: JobDefinition<Payload>) {
  return new BackgroundJob(definition);
}

class BackgroundJob<Payload> {
  private readonly queue: PQueue;
  private readonly runningJobs = new Map<string, AbortController>();

  constructor(private readonly definition: JobDefinition<Payload>) {
    this.queue = new PQueue({ concurrency: definition.concurrency });
  }

  trigger(payload: Payload) {
    const key = this.definition.key(payload);
    if (this.runningJobs.has(key)) return;

    const stopController = new AbortController();
    this.runningJobs.set(key, stopController);
    void this.queue
      .add(() => this.run(payload, stopController))
      .finally(() => this.runningJobs.delete(key));
  }

  stop(key: string) {
    this.runningJobs.get(key)?.abort();
  }

  stopAll() {
    for (const stopController of this.runningJobs.values()) stopController.abort();
  }

  isRunning(key: string) {
    return this.runningJobs.has(key);
  }

  private async run(payload: Payload, stopController: AbortController) {
    if (stopController.signal.aborted) return this.definition.onFinish?.(payload, "stopped");

    this.definition.onStart?.(payload);
    const signal = AbortSignal.any([
      stopController.signal,
      AbortSignal.timeout(this.definition.maxDurationMs),
    ]);
    try {
      await this.definition.run(payload, signal);
      this.definition.onFinish?.(payload, stopController.signal.aborted ? "stopped" : "done");
    } catch (error) {
      if (!stopController.signal.aborted) {
        createLogger(this.definition.id).error(`${this.definition.key(payload)} failed`, error);
      }
      this.definition.onFinish?.(payload, stopController.signal.aborted ? "stopped" : "failed");
    }
  }
}
