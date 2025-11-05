import fetch from "node-fetch";
import type {
  YorinConfig,
  ServerEvent,
  IdentifyProperties,
  GroupProperties,
  YorinResponse,
  PaymentProperties,
  SubscriptionProperties,
} from "./types";
import {
  Logger,
  retryWithBackoff,
  validateSecretKey,
  chunkArray,
} from "./utils";

export * from "./types";
export * from "./utils";

export class Yorin {
  private config: Required<YorinConfig>;
  private logger: Logger;
  private eventBatch: ServerEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config?: YorinConfig) {
    const secretKey = config?.secretKey || process.env.YORIN_SECRET_KEY || "";

    if (!secretKey) {
      throw new Error(
        "Yorin secret key is required. Pass it in config or set YORIN_SECRET_KEY environment variable.",
      );
    }

    if (!validateSecretKey(secretKey)) {
      throw new Error(
        'Invalid secret key format. Secret keys should start with "sk_".',
      );
    }

    const apiUrl =
      config?.apiUrl || process.env.YORIN_API_URL || "https://ingest.yorin.io";

    try {
      new URL(apiUrl);
    } catch {
      throw new Error("Invalid API URL format.");
    }

    this.config = {
      secretKey,
      apiUrl,
      debug: config?.debug ?? false,
      batchSize: config?.batchSize ?? 100,
      flushInterval: config?.flushInterval ?? 5000,
      enableBatching: config?.enableBatching ?? true,
      retryAttempts: config?.retryAttempts ?? 3,
      retryDelay: config?.retryDelay ?? 1000,
    };

    this.logger = new Logger(this.config.debug);

    this.logger.log("Yorin initialized with config:", {
      apiUrl: this.config.apiUrl,
      batchSize: this.config.batchSize,
      flushInterval: this.config.flushInterval,
      enableBatching: this.config.enableBatching,
    });

    this.startBatchTimer();
  }

  public async track(
    eventName: string,
    userId?: string,
    properties?: Record<string, any>,
    options?: {
      anonymousUserId?: string;
      sessionId?: string;
      pageUrl?: string;
      pageTitle?: string;
      referrer?: string;
      userAgent?: string;
      timestamp?: string;
    },
  ): Promise<void> {
    if (!eventName) {
      throw new Error("Event name is required");
    }

    if (!userId && !properties?.group_id) {
      throw new Error(
        "Either user_id or group_id (in properties) is required for server events",
      );
    }

    const event: ServerEvent = {
      event_name: eventName,
      user_id: userId,
      properties,
      anonymous_user_id: options?.anonymousUserId,
      session_id: options?.sessionId,
      page_url: options?.pageUrl,
      page_title: options?.pageTitle,
      referrer: options?.referrer,
      user_agent: options?.userAgent,
      timestamp: options?.timestamp || new Date().toISOString(),
    };

    this.logger.log("Tracking event:", event);
    await this.queueOrSendEvent(event);
  }

  public async identify(
    userId: string,
    properties?: IdentifyProperties,
  ): Promise<void> {
    if (!userId) {
      throw new Error("User ID is required for identify");
    }

    const processedProperties: Record<string, any> = {};

    if (properties) {
      Object.entries(properties).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === "email" && !("$email" in properties)) {
            processedProperties["$email"] = value;
          } else if (key === "name" && !("$full_name" in properties)) {
            processedProperties["$full_name"] = value;
          } else {
            processedProperties[key] = value;
          }
        }
      });
    }

    const event: ServerEvent = {
      event_name: "identify",
      user_id: userId,
      properties: processedProperties,
      timestamp: new Date().toISOString(),
    };

    this.logger.log("Identifying user:", event);
    await this.queueOrSendEvent(event);
  }

  public async group(
    groupId: string,
    userId?: string,
    properties?: Omit<GroupProperties, "group_id">,
  ): Promise<void> {
    if (!groupId) {
      throw new Error("Group ID is required");
    }

    const processedProperties: Record<string, any> = {
      group_id: groupId,
    };

    if (properties) {
      Object.entries(properties).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === "name" && !("$name" in properties)) {
            processedProperties["$name"] = value;
          } else {
            processedProperties[key] = value;
          }
        }
      });
    }

    const event: ServerEvent = {
      event_name: "group",
      user_id: userId,
      properties: processedProperties,
      timestamp: new Date().toISOString(),
    };

    this.logger.log("Group event:", event);
    await this.queueOrSendEvent(event);
  }

  public async page(
    name?: string,
    userId?: string,
    properties?: Record<string, any>,
    options?: {
      url?: string;
      title?: string;
      referrer?: string;
    },
  ): Promise<void> {
    const event: ServerEvent = {
      event_name: "page",
      user_id: userId,
      properties: {
        name,
        ...properties,
      },
      page_url: options?.url,
      page_title: options?.title || name,
      referrer: options?.referrer,
      timestamp: new Date().toISOString(),
    };

    this.logger.log("Page event:", event);
    await this.queueOrSendEvent(event);
  }

  public async payment(
    userId: string,
    paymentProperties: PaymentProperties,
    options?: {
      anonymousUserId?: string;
      sessionId?: string;
      timestamp?: string;
    }
  ): Promise<void> {
    if (!userId) {
      throw new Error('User ID is required for payment events');
    }

    if (!paymentProperties.amount || !paymentProperties.currency) {
      throw new Error('Amount and currency are required for payment events');
    }

    const {
      payment_id,
      amount,
      currency,
      payment_method,
      payment_status,
      stripe_session_id,
      ...otherProperties
    } = paymentProperties;

    // Build properties object with payment data as $-prefixed properties for ClickHouse extraction
    const properties: Record<string, any> = {
      // Payment properties with $ prefix (will be extracted to dedicated ClickHouse columns)
      $transaction_id: payment_id,
      $amount: amount,
      $currency: currency,
      $payment_method: payment_method,
      $status: payment_status,
      // Custom properties (no $ prefix, will go to properties array)
      stripe_session_id: stripe_session_id,
      ...otherProperties
    };

    const event: ServerEvent = {
      event_name: 'payment',
      user_id: userId,
      properties,
      anonymous_user_id: options?.anonymousUserId,
      session_id: options?.sessionId,
      timestamp: options?.timestamp || new Date().toISOString(),
    };

    this.logger.log('Payment event:', event);
    await this.queueOrSendEvent(event);
  }

  public async subscription(
    subscriptionProperties: SubscriptionProperties,
    options?: {
      userId?: string;
      groupId?: string;
      anonymousUserId?: string;
      sessionId?: string;
      timestamp?: string;
    }
  ): Promise<void> {
    if (!subscriptionProperties.plan_id) {
      throw new Error('plan_id is required for subscription events');
    }

    if (!subscriptionProperties.status) {
      throw new Error('status is required for subscription events');
    }

    // Determine subscriber based on type
    let subscriber_id = subscriptionProperties.subscriber_id;
    let user_id: string | undefined;

    if (subscriptionProperties.subscriber_type === 'contact') {
      subscriber_id = subscriber_id || options?.userId;
      user_id = subscriber_id;
      if (!subscriber_id) {
        throw new Error('userId is required for contact subscriptions');
      }
    } else if (subscriptionProperties.subscriber_type === 'group') {
      subscriber_id = subscriber_id || options?.groupId;
      user_id = options?.userId; // Optional user context
      if (!subscriber_id) {
        throw new Error('groupId is required for group subscriptions');
      }
    }

    const {
      external_subscription_id,
      plan_id,
      plan_name,
      status,
      subscriber_type,
      amount,
      currency,
      billing_cycle,
      started_at,
      trial_ends_at,
      current_period_start,
      current_period_end,
      cancelled_at,
      provider,
      ...customFields
    } = subscriptionProperties;

    // Build properties with subscription data
    const properties: Record<string, any> = {
      // Subscription properties with $ prefix (for potential ClickHouse extraction)
      $subscription_id: external_subscription_id,
      $plan_id: plan_id,
      $plan_name: plan_name,
      $subscription_status: status,
      $subscriber_type: subscriber_type,
      $subscriber_id: subscriber_id,
      $subscription_amount: amount,
      $subscription_currency: currency,
      $billing_cycle: billing_cycle,
      $started_at: started_at,
      $trial_ends_at: trial_ends_at,
      $current_period_start: current_period_start,
      $current_period_end: current_period_end,
      $cancelled_at: cancelled_at,
      $provider: provider,

      // Custom fields (no $ prefix)
      ...customFields
    };

    const event: ServerEvent = {
      event_name: 'subscription',
      user_id,
      properties,
      anonymous_user_id: options?.anonymousUserId,
      session_id: options?.sessionId,
      timestamp: options?.timestamp || new Date().toISOString(),
    };

    this.logger.log('Subscription event:', event);
    await this.queueOrSendEvent(event);
  }

  public async trackBatch(events: ServerEvent[]): Promise<void> {
    if (events.length === 0) {
      this.logger.warn("Cannot send empty batch");
      return;
    }

    if (events.length > 1000) {
      this.logger.warn("Batch size too large, splitting into smaller batches");
      const chunks = chunkArray(events, 1000);
      for (const chunk of chunks) {
        await this.sendBatch(chunk);
      }
      return;
    }

    await this.sendBatch(events);
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
      await this.sendBatch([event]);
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

    await this.sendBatch(events);
  }

  private async sendBatch(events: ServerEvent[]): Promise<void> {
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
        this.config.retryDelay,
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
          `Timer flush: sending ${this.eventBatch.length} events`,
        );
        await this.flushBatch();
      }
    }, this.config.flushInterval);
  }
}
