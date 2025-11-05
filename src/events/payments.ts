import type { ServerEvent, PaymentProperties } from "../types";

export interface PaymentOptions {
  anonymousUserId?: string;
  sessionId?: string;
  timestamp?: string;
}

export class PaymentManager {
  /**
   * Create a payment event
   */
  public static createPaymentEvent(
    userId: string,
    paymentProperties: PaymentProperties,
    options?: PaymentOptions
  ): ServerEvent {
    if (!userId) {
      throw new Error("User ID is required for payment events");
    }

    if (!paymentProperties.amount || !paymentProperties.currency) {
      throw new Error("Amount and currency are required for payment events");
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
    const properties: Record<string, unknown> = {
      // Payment properties with $ prefix (will be extracted to dedicated ClickHouse columns)
      $transaction_id: payment_id,
      $amount: amount,
      $currency: currency,
      $payment_method: payment_method,
      $status: payment_status,
      // Custom properties (no $ prefix, will go to properties array)
      stripe_session_id,
      ...otherProperties,
    };

    return {
      event_name: "$payments",
      user_id: userId,
      properties,
      anonymous_user_id: options?.anonymousUserId,
      session_id: options?.sessionId,
      timestamp: options?.timestamp || new Date().toISOString(),
    };
  }
}