import fetch from "node-fetch";
import { setInterval, clearInterval } from "timers";
import type { ServerEvent, YorinResponse } from "../types";
import { Logger, retryWithBackoff, chunkArray } from "../utils";

export interface ClientConfig {
  secretKey: string;
  apiUrl: string;
  debug: boolean;
  batchSize: number;
  flushInterval: number;
  enableBatching: boolean;
  retryAttempts: number;
  retryDelay: number;
}

export class YorinClient {
  private config: ClientConfig;
  private logger: Logger;
  private eventBatch: ServerEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: ClientConfig) {
    this.config = config;
    this.logger = new Logger(this.config.debug);

    this.logger.log("Yorin client initialized with config:", {
      apiUrl: this.config.apiUrl,
      batchSize: this.config.batchSize,
      flushInterval: this.config.flushInterval,
      enableBatching: this.config.enableBatching,
    });

    this.startBatchTimer();
  }

  public async sendEvent(event: ServerEvent): Promise<void> {
    this.logger.log("Sending event:", event);
    await this.queueOrSendEvent(event);
  }

  public async sendBatch(events: ServerEvent[]): Promise<void> {
    if (events.length === 0) {
      this.logger.warn("Cannot send empty batch");
      return;
    }

    if (events.length > 1000) {
      this.logger.warn("Batch size too large, splitting into smaller batches");
      const chunks = chunkArray(events, 1000);
      for (const chunk of chunks) {
        await this.sendBatchInternal(chunk);
      }
      return;
    }

    await this.sendBatchInternal(events);
  }

  public async flush(): Promise<void> {
    if (this.eventBatch.length > 0) {
      await this.flushBatch();
    }
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush().catch((error) => {
      this.logger.error("Error during destroy flush:", error);
    });
  }

  private async queueOrSendEvent(event: ServerEvent): Promise<void> {
    if (!this.config.enableBatching) {
      await this.sendBatchInternal([event]);
      return;
    }

    this.eventBatch.push(event);

    if (this.eventBatch.length >= this.config.batchSize) {
      await this.flushBatch();
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.eventBatch.length === 0) {
      return;
    }

    const events = [...this.eventBatch];
    this.eventBatch = [];

    await this.sendBatchInternal(events);
  }

  private async sendBatchInternal(events: ServerEvent[]): Promise<void> {
    try {
      const payload = events.length === 1 ? events[0] : events;

      await retryWithBackoff(
        async () => {
          const response = await fetch(`${this.config.apiUrl}/v1/events`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.config.secretKey}`,
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          const result = (await response.json()) as YorinResponse;

          if (!result.success) {
            throw new Error(result.message || "Failed to send events");
          }

          this.logger.log(`Successfully sent ${events.length} event(s)`);
        },
        this.config.retryAttempts,
        this.config.retryDelay
      );
    } catch (error) {
      this.logger.error("Failed to send events:", error);
      throw error;
    }
  }

  private startBatchTimer(): void {
    if (!this.config.enableBatching || this.flushTimer) {
      return;
    }

    this.flushTimer = setInterval(async () => {
      if (this.eventBatch.length > 0) {
        this.logger.log(
          `Timer flush: sending ${this.eventBatch.length} events`
        );
        await this.flushBatch();
      }
    }, this.config.flushInterval);
  }
}