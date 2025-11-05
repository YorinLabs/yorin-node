import { URL } from "url";
import type {
  YorinConfig,
  ServerEvent,
  IdentifyProperties,
  GroupProperties,
  PaymentProperties,
  SubscriptionProperties,
} from "./types";
import { validateSecretKey } from "./utils";
import { YorinClient } from "./core/client";
import {
  ContactManager,
  GroupManager,
  PaymentManager,
  SubscriptionManager,
  TrackingManager,
  type ContactOptions,
  type GroupOptions,
  type PaymentOptions,
  type SubscriptionOptions,
  type TrackingOptions,
  type PageOptions,
} from "./events";

export * from "./types";
export * from "./utils";
export * from "./events";
export * from "./core/client";

export class Yorin {
  private client: YorinClient;

  constructor(config?: YorinConfig) {
    const secretKey = config?.secretKey || process.env.YORIN_SECRET_KEY || "";

    if (!secretKey) {
      throw new Error(
        "Yorin secret key is required. Pass it in config or set YORIN_SECRET_KEY environment variable."
      );
    }

    if (!validateSecretKey(secretKey)) {
      throw new Error(
        'Invalid secret key format. Secret keys should start with "sk_".'
      );
    }

    const apiUrl =
      config?.apiUrl || process.env.YORIN_API_URL || "https://ingest.yorin.io";

    try {
      new URL(apiUrl);
    } catch {
      throw new Error("Invalid API URL format.");
    }

    const clientConfig = {
      secretKey,
      apiUrl,
      debug: config?.debug ?? false,
      batchSize: config?.batchSize ?? 100,
      flushInterval: config?.flushInterval ?? 5000,
      enableBatching: config?.enableBatching ?? true,
      retryAttempts: config?.retryAttempts ?? 3,
      retryDelay: config?.retryDelay ?? 1000,
    };

    this.client = new YorinClient(clientConfig);
  }

  // === CONTACT MANAGEMENT ===

  public async addOrUpdateContact(
    userId: string,
    properties?: IdentifyProperties,
    options?: ContactOptions
  ): Promise<void> {
    const event = ContactManager.createAddOrUpdateContactEvent(
      userId,
      properties,
      options
    );
    await this.client.sendEvent(event);
  }

  public async deleteContact(
    userId: string,
    options?: ContactOptions
  ): Promise<void> {
    const event = ContactManager.createDeleteContactEvent(userId, options);
    await this.client.sendEvent(event);
  }

  // === GROUP MANAGEMENT ===

  public async addOrUpdateGroup(
    groupId: string,
    userId?: string,
    properties?: Omit<GroupProperties, "group_id">,
    options?: GroupOptions
  ): Promise<void> {
    const event = GroupManager.createAddOrUpdateGroupEvent(
      groupId,
      userId,
      properties,
      options
    );
    await this.client.sendEvent(event);
  }

  public async deleteGroup(
    groupId: string,
    userId?: string,
    options?: GroupOptions
  ): Promise<void> {
    const event = GroupManager.createDeleteGroupEvent(groupId, userId, options);
    await this.client.sendEvent(event);
  }

  // === PAYMENT TRACKING ===

  public async payment(
    userId: string,
    paymentProperties: PaymentProperties,
    options?: PaymentOptions
  ): Promise<void> {
    const event = PaymentManager.createPaymentEvent(
      userId,
      paymentProperties,
      options
    );
    await this.client.sendEvent(event);
  }

  // === SUBSCRIPTION TRACKING ===

  public async subscription(
    subscriptionProperties: SubscriptionProperties,
    options?: SubscriptionOptions
  ): Promise<void> {
    const event = SubscriptionManager.createSubscriptionEvent(
      subscriptionProperties,
      options
    );
    await this.client.sendEvent(event);
  }

  // === GENERAL TRACKING ===

  public async track(
    eventName: string,
    userId?: string,
    properties?: Record<string, unknown>,
    options?: TrackingOptions
  ): Promise<void> {
    const event = TrackingManager.createTrackEvent(
      eventName,
      userId,
      properties,
      options
    );
    await this.client.sendEvent(event);
  }

  public async page(
    name?: string,
    userId?: string,
    properties?: Record<string, unknown>,
    options?: PageOptions
  ): Promise<void> {
    const event = TrackingManager.createPageEvent(
      name,
      userId,
      properties,
      options
    );
    await this.client.sendEvent(event);
  }

  // === BATCH OPERATIONS ===

  public async trackBatch(events: ServerEvent[]): Promise<void> {
    await this.client.sendBatch(events);
  }

  public async flush(): Promise<void> {
    await this.client.flush();
  }

  public destroy(): void {
    this.client.destroy();
  }

}