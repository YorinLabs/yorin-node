# Aizu Node.js SDK

The official Aizu Analytics SDK for Node.js server environments. Track user events, payments, subscriptions, and more with built-in batching, retry logic, and TypeScript support.

## Features

- 📊 **Complete Analytics Tracking**: Track custom events, page views, user identification, and more
- 💳 **Payment & Subscription Tracking**: Built-in support for payment and subscription events
- 👥 **User & Group Management**: Manage contacts and groups with dedicated event types
- 🚀 **Optimized Performance**: Automatic batching, retry logic, and efficient network usage
- 🔧 **TypeScript Support**: Full TypeScript definitions and type safety
- 🛡️ **Robust Error Handling**: Built-in retry mechanism with exponential backoff
- ⚙️ **Flexible Configuration**: Configurable batching, timeouts, and API endpoints

## Installation

```bash
npm install aizu-nodejs
```

```bash
yarn add aizu-nodejs
```

## Quick Start

```typescript
import { Aizu } from 'aizu-nodejs';

// Initialize with your secret key
const aizu = new Aizu({
  secretKey: 'sk_your_secret_key_here', // Get this from your Aizu dashboard
  apiUrl: 'https://ingest.aizu.io',    // Optional: defaults to Aizu's ingest endpoint
  debug: false                          // Optional: enable debug logging
});

// Track a custom event
await aizu.track('button_clicked', 'user_123', {
  button_name: 'signup',
  page: 'landing'
});

// Track user information
await aizu.addOrUpdateContact('user_123', {
  $email: 'user@example.com',
  $full_name: 'John Doe',
  $company: 'Acme Corp'
});

// Track payments
await aizu.payment('user_123', {
  amount: 99.99,
  currency: 'USD',
  payment_status: 'completed',
  payment_method: 'credit_card'
});

// Don't forget to clean up when your app shuts down
process.on('SIGTERM', () => {
  aizu.destroy();
});
```

## Configuration Options

```typescript
interface AizuConfig {
  secretKey?: string;        // Your secret API key (required, must start with 'sk_')
  apiUrl?: string;          // API endpoint (default: 'https://ingest.aizu.io')
  debug?: boolean;          // Enable debug logging (default: false)
  batchSize?: number;       // Events per batch (default: 100)
  flushInterval?: number;   // Auto-flush interval in ms (default: 5000)
  enableBatching?: boolean; // Enable event batching (default: true)
  retryAttempts?: number;   // Number of retry attempts (default: 3)
  retryDelay?: number;      // Initial retry delay in ms (default: 1000)
}
```

You can also use environment variables:
- `YORIN_SECRET_KEY` - Your secret key
- `YORIN_API_URL` - API endpoint

```typescript
// Will automatically use environment variables
const aizu = new Aizu();
```

## API Reference

### Contact Management

#### `addOrUpdateContact(userId, properties?, options?)`

Create or update contact profiles.

```typescript
await aizu.addOrUpdateContact('user_123', {
  $email: 'user@example.com',
  $full_name: 'John Doe',
  $first_name: 'John',
  $last_name: 'Doe',
  $phone: '+1-555-0123',
  $company: 'Acme Corp',
  $job_title: 'Software Engineer',
  $avatar_url: 'https://example.com/avatar.jpg',
  // Custom properties
  subscription_tier: 'premium',
  signup_date: '2024-01-01'
}, {
  anonymousUserId: 'anon_123',
  sessionId: 'session_456',
  timestamp: new Date().toISOString()
});
```

**Standard Properties:**
- `$email` - Email address
- `$full_name` - Full name
- `$first_name` - First name
- `$last_name` - Last name
- `$phone` - Phone number
- `$company` - Company name
- `$job_title` - Job title
- `$avatar_url` - Avatar image URL

#### `deleteContact(userId, options?)`

Delete a contact by user ID.

```typescript
await aizu.deleteContact('user_123', {
  anonymousUserId: 'anon_123',
  sessionId: 'session_456'
});
```

### Group Management

#### `addOrUpdateGroup(groupId, userId?, properties?, options?)`

Create or update groups/organizations.

```typescript
await aizu.addOrUpdateGroup('company_456', 'user_123', {
  $name: 'Acme Corp',
  $description: 'A technology company',
  $company: 'Acme Corporation',
  $website: 'https://acme.com',
  $industry: 'Technology',
  $size: 1000,
  $email: 'contact@acme.com',
  $phone: '+1-555-0100',
  // Custom properties
  plan: 'enterprise',
  founded_year: 2010
}, {
  anonymousUserId: 'anon_123',
  sessionId: 'session_456'
});
```

**Standard Group Properties:**
- `$name` - Group name
- `$description` - Group description
- `$company` - Company name
- `$website` - Website URL
- `$industry` - Industry
- `$size` - Organization size (number or string)
- `$email` - Contact email
- `$phone` - Contact phone

#### `deleteGroup(groupId, userId?, options?)`

Delete a group by group ID.

```typescript
await aizu.deleteGroup('company_456', 'user_123');
```

### Event Tracking

#### `track(eventName, userId?, properties?, options?)`

Track custom events with properties. Requires either `userId` or `group_id` in properties.

```typescript
// User event
await aizu.track('subscription_upgraded', 'user_123', {
  from_plan: 'basic',
  to_plan: 'premium',
  monthly_value: 49.99
});

// Group event (no userId required)
await aizu.track('team_created', undefined, {
  group_id: 'company_456',
  team_size: 5,
  department: 'engineering'
});
```

#### `page(name?, userId?, properties?, options?)`

Track page views.

```typescript
await aizu.page('Dashboard', 'user_123', {
  section: 'analytics',
  tab: 'overview'
}, {
  url: 'https://app.example.com/dashboard',
  title: 'Analytics Dashboard',
  referrer: 'https://app.example.com/home'
});
```

### Payment Tracking

#### `payment(userId, paymentProperties, options?)`

Track payment events for analytics.

```typescript
await aizu.payment('user_123', {
  payment_id: 'pay_stripe_abc123',        // Optional: Payment identifier
  amount: 49.99,                          // Required: Payment amount
  currency: 'USD',                        // Required: Currency code
  payment_method: 'credit_card',          // Optional: Payment method
  payment_status: 'completed',            // Optional: Payment status
  stripe_session_id: 'cs_test_xyz789',    // Optional: Stripe session ID
  product_id: 'prod_monthly_plan',        // Optional: Product identifier
  subscription_id: 'sub_user123',         // Optional: Subscription ID
  invoice_id: 'inv_202401001'             // Optional: Invoice ID
});
```

**Payment Status Options:**
- `'pending'` - Payment is processing
- `'completed'` - Payment successful
- `'failed'` - Payment failed
- `'refunded'` - Payment was refunded
- `'cancelled'` - Payment was cancelled

### Subscription Management

#### `subscription(subscriptionProperties, options?)`

Track subscription events and manage subscription lifecycle.

**Contact Subscription:**
```typescript
await aizu.subscription({
  plan_id: 'premium_monthly',                    // Required: Plan identifier
  plan_name: 'Premium Monthly Plan',             // Optional: Human-readable plan name
  status: 'active',                             // Required: Subscription status
  subscriber_type: 'contact',                   // Required: 'contact' or 'group'
  subscriber_id: 'user_123',                    // Optional: Explicit subscriber ID
  amount: 29.99,                               // Optional: Subscription amount
  currency: 'USD',                             // Optional: Currency
  billing_cycle: 'monthly',                    // Optional: Billing cycle
  external_subscription_id: 'sub_stripe_123',  // Optional: External provider ID
  provider: 'stripe',                          // Optional: Payment provider
  started_at: new Date().toISOString(),        // Optional: Start date
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  features: ['advanced_analytics', 'priority_support'],
  description: 'Full access to premium features'
}, {
  userId: 'user_123'  // Required for contact subscriptions
});
```

**Group Subscription:**
```typescript
await aizu.subscription({
  plan_id: 'enterprise_plan',
  plan_name: 'Enterprise Plan',
  status: 'active',
  subscriber_type: 'group',
  amount: 999.99,
  currency: 'USD',
  billing_cycle: 'yearly',
  setup_fee: 500.00,
  billing_interval: 1,
  features: ['unlimited_users', 'dedicated_support']
}, {
  groupId: 'company_456',  // Required for group subscriptions
  userId: 'admin_user_123' // Optional: Admin user context
});
```

**Subscription Status Options:**
- `'trialing'` - In trial period
- `'active'` - Active subscription
- `'canceled'` - Cancelled subscription
- `'incomplete'` - Incomplete setup
- `'incomplete_expired'` - Incomplete setup expired
- `'past_due'` - Payment past due
- `'unpaid'` - Unpaid subscription
- `'paused'` - Temporarily paused

**Billing Cycle Options:**
- `'monthly'`, `'yearly'`, `'quarterly'`, `'weekly'`, `'one_time'`, `'custom'`

### Batch Operations

#### `trackBatch(events)`

Send multiple events in a single request for efficiency.

```typescript
await aizu.trackBatch([
  {
    event_name: 'login',
    user_id: 'user_123',
    properties: { method: 'oauth' },
    timestamp: new Date().toISOString()
  },
  {
    event_name: 'feature_used',
    user_id: 'user_123',
    properties: { feature: 'export' },
    timestamp: new Date().toISOString()
  }
]);
```

#### `flush()`

Manually flush queued events (useful before shutdown).

```typescript
await aizu.flush();
```

#### `destroy()`

Clean up resources and flush remaining events.

```typescript
aizu.destroy(); // Automatically flushes remaining events
```

## Advanced Usage

### Event Batching

Events are automatically batched for optimal performance:

```typescript
const aizu = new Aizu({
  secretKey: 'sk_...',
  enableBatching: true,  // Enable batching (default: true)
  batchSize: 100,        // Send when 100 events are queued (default: 100)
  flushInterval: 5000    // Auto-flush every 5 seconds (default: 5000ms)
});
```

- Events are sent when `batchSize` is reached
- Events are auto-flushed every `flushInterval` milliseconds
- Large batches (>1000 events) are automatically split into chunks
- Disable batching by setting `enableBatching: false`

### Error Handling & Retries

The SDK includes automatic retry with exponential backoff:

```typescript
const aizu = new Aizu({
  secretKey: 'sk_...',
  retryAttempts: 3,  // Number of retry attempts (default: 3)
  retryDelay: 1000   // Initial delay between retries in ms (default: 1000)
});

try {
  await aizu.track('purchase', 'user_123', { amount: 100 });
} catch (error) {
  // SDK already retried 3 times with exponential backoff
  console.error('Failed to track event after retries:', error);
}
```

### Debug Logging

Enable debug logging to see SDK activity:

```typescript
const aizu = new Aizu({
  secretKey: 'sk_...',
  debug: true  // Enables detailed logging
});
```

## Framework Integration

### Express.js Middleware

```typescript
import express from 'express';
import { Aizu } from 'aizu-nodejs';

const app = express();
const aizu = new Aizu({
  secretKey: process.env.YORIN_SECRET_KEY
});

// Track API requests
app.use((req, res, next) => {
  if (req.user) {
    aizu.track('api_request', req.user.id, {
      endpoint: req.path,
      method: req.method,
      user_agent: req.get('User-Agent')
    });
  }
  next();
});

// Cleanup on shutdown
process.on('SIGTERM', () => {
  aizu.destroy();
  process.exit(0);
});
```

### Next.js API Routes

```typescript
// pages/api/users/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Aizu } from 'aizu-nodejs';

const aizu = new Aizu({
  secretKey: process.env.YORIN_SECRET_KEY
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'POST') {
    const userData = req.body;

    // Update user and track in Aizu
    await aizu.addOrUpdateContact(id as string, {
      $email: userData.email,
      $full_name: userData.name,
      subscription_plan: userData.plan
    });

    res.json({ success: true });
  }
}
```

### TypeScript

Full TypeScript support with comprehensive type definitions:

```typescript
import {
  Aizu,
  AizuConfig,
  IdentifyProperties,
  PaymentProperties,
  SubscriptionProperties,
  ServerEvent
} from 'aizu-nodejs';

const config: AizuConfig = {
  secretKey: 'sk_your_key',
  debug: true,
  enableBatching: true
};

const aizu = new Aizu(config);

const userProps: IdentifyProperties = {
  $email: 'user@example.com',
  $full_name: 'John Doe',
  custom_field: 'value'
};

const paymentProps: PaymentProperties = {
  amount: 99.99,
  currency: 'USD',
  payment_status: 'completed'
};

// Type-safe operations
await aizu.addOrUpdateContact('user_123', userProps);
await aizu.payment('user_123', paymentProps);
```

## Error Handling

All methods throw errors that should be handled appropriately:

```typescript
try {
  await aizu.track('event_name', 'user_123', { data: 'value' });
} catch (error) {
  if (error instanceof Error) {
    console.error('Tracking failed:', error.message);
    // Handle error (log, retry, etc.)
  }
}
```

Common error scenarios:
- Network connectivity issues (automatically retried)
- Invalid API credentials
- Missing required parameters
- Invalid event data

## Best Practices

1. **Always destroy the client on shutdown:**
   ```typescript
   process.on('SIGTERM', () => {
     aizu.destroy();
   });
   ```

2. **Use batching for high-volume applications:**
   ```typescript
   const aizu = new Aizu({
     enableBatching: true,
     batchSize: 100,
     flushInterval: 5000
   });
   ```

3. **Handle errors gracefully:**
   ```typescript
   try {
     await aizu.track('event', 'user_id', data);
   } catch (error) {
     // Log but don't crash the app
     console.error('Analytics tracking failed:', error);
   }
   ```

4. **Use environment variables for configuration:**
   ```bash
   YORIN_SECRET_KEY=sk_your_secret_key
   YORIN_API_URL=https://your-custom-endpoint.com
   ```

## Testing

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

Run linting and type checking:

```bash
npm run lint
npm run typecheck
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 4.5 (for TypeScript projects)

## License

MIT License - see LICENSE file for details.

## Support

- **Documentation**: [https://aizu.io/docs](https://aizu.io/docs)
- **Issues**: [GitHub Issues](https://github.com/AizuLabs/aizu-nodejs/issues)
- **Email**: support@aizu.io

---

Built with ❤️ by Aizu Labs