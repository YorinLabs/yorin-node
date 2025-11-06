import type { ServerEvent, SubscriptionProperties } from "../types";

export interface SubscriptionOptions {
  userId?: string;
  groupId?: string;
  anonymousUserId?: string;
  sessionId?: string;
  timestamp?: string;
}

export class SubscriptionManager {
  /**
   * Create a subscription event
   */
  public static createSubscriptionEvent(
    subscriptionProperties: SubscriptionProperties,
    options?: SubscriptionOptions
  ): ServerEvent {
    if (!subscriptionProperties.plan_id) {
      throw new Error("plan_id is required for subscription events");
    }

    if (!subscriptionProperties.status) {
      throw new Error("status is required for subscription events");
    }

    // Determine subscriber based on type
    let subscriber_id = subscriptionProperties.subscriber_id;
    let user_id: string | undefined;

    if (subscriptionProperties.subscriber_type === "contact") {
      subscriber_id = subscriber_id || options?.userId;
      user_id = subscriber_id;
      if (!subscriber_id) {
        throw new Error("userId is required for contact subscriptions");
      }
    } else if (subscriptionProperties.subscriber_type === "group") {
      subscriber_id = subscriber_id || options?.groupId;
      user_id = options?.userId; // Optional user context
      if (!subscriber_id) {
        throw new Error("groupId is required for group subscriptions");
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
      ends_at,
      description,
      setup_fee,
      billing_interval,
      features,
      notes,
      provider,
      ...customFields
    } = subscriptionProperties;

    // Build properties with subscription data (matching backend expectations)
    const properties: Record<string, unknown> = {
      // Core subscription properties (these map to backend fields)
      $external_subscription_id: external_subscription_id,
      $plan_name: plan_name || plan_id, // Backend expects $plan_name
      $plan: plan_name || plan_id, // Fallback field
      $status: status, // Maps to subscription status
      $subscriber_type: subscriber_type,
      $subscriber_id: subscriber_id,
      $amount: amount,
      $currency: currency,
      $billing_cycle: billing_cycle,
      $description: description,
      $setup_fee: setup_fee,
      $billing_interval: billing_interval,
      $features: features,
      $notes: notes,
      $provider: provider,

      // Date fields (backend expects these exact names)
      $started_at: started_at,
      $trial_ends_at: trial_ends_at,
      $current_period_end: current_period_end,
      $current_period_start: current_period_start,
      $cancelled_at: cancelled_at,
      $ends_at: ends_at,

      // Custom fields (no $ prefix)
      ...customFields,
    };

    return {
      event_name: "subscription",
      user_id,
      properties,
      anonymous_user_id: options?.anonymousUserId,
      session_id: options?.sessionId,
      timestamp: options?.timestamp || new Date().toISOString(),
    };
  }
}