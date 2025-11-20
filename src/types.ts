export interface AizuConfig {
  secretKey?: string;
  apiUrl?: string;
  debug?: boolean;
  batchSize?: number;
  flushInterval?: number;
  enableBatching?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ServerEvent {
  event_name: string;
  user_id?: string | undefined;
  anonymous_user_id?: string | undefined;
  session_id?: string | undefined;
  properties?: Record<string, unknown> | undefined;
  page_url?: string | undefined;
  page_title?: string | undefined;
  referrer?: string | undefined;
  user_agent?: string | undefined;
  timestamp?: string | undefined;
}

export interface IdentifyProperties {
  $email?: string;
  $full_name?: string;
  $first_name?: string;
  $last_name?: string;
  $phone?: string;
  $company?: string;
  $job_title?: string;
  $avatar_url?: string;
  [key: string]: unknown;
}

export interface GroupProperties {
  group_id: string;
  $name?: string;
  $description?: string;
  $company?: string;
  $website?: string;
  $industry?: string;
  $size?: string | number;
  $email?: string;
  $phone?: string;
  [key: string]: unknown;
}

export interface AizuResponse {
  success: boolean;
  message: string;
}

export interface BatchRequest {
  events: ServerEvent[];
}

export interface PaymentProperties {
  payment_id?: string;
  amount: number;
  currency: string;
  payment_method?: string;
  payment_status?: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  stripe_session_id?: string;
  // Additional payment properties
  product_id?: string;
  subscription_id?: string;
  invoice_id?: string;
  [key: string]: unknown;
}

export interface SubscriptionProperties {
  // Core subscription fields
  external_subscription_id?: string; // From Stripe, Paddle, etc.
  plan_id: string;
  plan_name?: string;
  status: 'trialing' | 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid' | 'paused';

  // Subscriber (polymorphic)
  subscriber_type: 'contact' | 'group';
  subscriber_id?: string; // If not provided, uses userId or groupId from event

  // Pricing
  amount?: number;
  currency?: string;
  billing_cycle?: 'monthly' | 'yearly' | 'quarterly' | 'weekly' | 'one_time' | 'custom';

  // Dates (ISO strings)
  started_at?: string;
  trial_ends_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancelled_at?: string;
  ends_at?: string; // For subscription end date

  // Additional subscription metadata
  description?: string;
  setup_fee?: number;
  billing_interval?: number; // e.g., 2 for "every 2 months"
  features?: string[]; // List of features included
  notes?: string;

  // Metadata
  provider?: string; // 'stripe', 'paddle', 'manual', etc.
  [key: string]: unknown; // Custom fields
}