# Yorin Node.js SDK

Official Node.js SDK for Yorin Analytics - Server-side event tracking for your backend applications.

## Installation

```bash
npm install yorin-nodejs
# or
yarn add yorin-nodejs
```

## Quick Start

```javascript
const { Yorin } = require('yorin-nodejs');
// or
import { Yorin } from 'yorin-nodejs';

// Initialize with secret key
const yorin = new Yorin({
  secretKey: 'sk_your_secret_key', // or use YORIN_SECRET_KEY env var
  apiUrl: 'https://ingest.yorin.io', // optional, or use YORIN_API_URL env var
  debug: true // optional, enables logging
});

// Track an event
await yorin.track('purchase_completed', 'user_123', {
  amount: 99.99,
  currency: 'USD',
  product_id: 'prod_456'
});

// Identify a user
await yorin.identify('user_123', {
  $email: 'john@example.com',
  $full_name: 'John Doe',
  plan: 'premium'
});

// Track a group
await yorin.group('org_789', 'user_123', {
  $name: 'Acme Corp',
  $industry: 'Technology',
  employees: 500
});

// Track a payment
await yorin.payment('user_123', {
  payment_id: 'pay_abc123',
  amount: 99.99,
  currency: 'USD',
  payment_method: 'credit_card',
  payment_status: 'completed',
  product_id: 'prod_premium',
  stripe_session_id: 'cs_test_xyz789'
});

// Flush events (useful before shutdown)
await yorin.flush();
```

## Configuration

```javascript
const yorin = new Yorin({
  secretKey: 'sk_your_secret_key',    // Required: Your secret key
  apiUrl: 'https://ingest.yorin.io',  // Optional: API endpoint
  debug: false,                        // Optional: Enable debug logging
  batchSize: 100,                      // Optional: Events per batch (default: 100)
  flushInterval: 5000,                 // Optional: Auto-flush interval in ms (default: 5000)
  enableBatching: true,                // Optional: Enable event batching (default: true)
  retryAttempts: 3,                    // Optional: Number of retry attempts (default: 3)
  retryDelay: 1000                     // Optional: Initial retry delay in ms (default: 1000)
});
```

## API Methods

### `track(eventName, userId?, properties?, options?)`

Track custom events with properties.

```javascript
await yorin.track('subscription_upgraded', 'user_123', {
  from_plan: 'basic',
  to_plan: 'premium',
  monthly_value: 49.99
});
```

### `identify(userId, properties?)`

Create or update user profiles.

```javascript
await yorin.identify('user_123', {
  $email: 'user@example.com',
  $full_name: 'John Doe',
  $company: 'Acme Corp',
  subscription_tier: 'premium',
  created_at: '2024-01-01'
});
```

### `group(groupId, userId?, properties?)`

Associate users with groups/organizations.

```javascript
await yorin.group('company_456', 'user_123', {
  $name: 'Acme Corp',
  $industry: 'SaaS',
  $size: 1000,
  plan: 'enterprise'
});
```

### `page(name?, userId?, properties?, options?)`

Track page views (server-rendered apps).

```javascript
await yorin.page('Dashboard', 'user_123', {
  section: 'analytics'
}, {
  url: 'https://app.example.com/dashboard',
  title: 'Analytics Dashboard'
});
```

### `payment(userId, paymentProperties, options?)`

Track payment events with dedicated payment fields.

```javascript
await yorin.payment('user_123', {
  payment_id: 'pay_stripe_abc123',
  amount: 49.99,
  currency: 'USD',
  payment_method: 'stripe',
  payment_status: 'completed',
  stripe_session_id: 'cs_test_xyz789',
  product_id: 'prod_monthly_plan',
  subscription_id: 'sub_user123',
  invoice_id: 'inv_202401001'
});
```

**Payment Status Options:**
- `'pending'` - Payment is processing
- `'completed'` - Payment successful
- `'failed'` - Payment failed
- `'refunded'` - Payment was refunded
- `'cancelled'` - Payment was cancelled

### `trackBatch(events)`

Send multiple events in a single request.

```javascript
await yorin.trackBatch([
  {
    event_name: 'login',
    user_id: 'user_123',
    properties: { method: 'oauth' }
  },
  {
    event_name: 'feature_used',
    user_id: 'user_123',
    properties: { feature: 'export' }
  }
]);
```

### `flush()`

Manually flush queued events.

```javascript
// Flush before application shutdown
await yorin.flush();
```

### `destroy()`

Clean up resources and flush remaining events.

```javascript
// On application shutdown
yorin.destroy();
```

## Environment Variables

The SDK supports configuration through environment variables:

- `YORIN_SECRET_KEY` - Your secret key (starts with `sk_`)
- `YORIN_API_URL` - API endpoint (defaults to `https://ingest.yorin.io`)

## Event Requirements

Server events **require** either:
- `user_id` - Your external user identifier
- `group_id` in properties - For group-level events

## Property Naming

Default properties use the `$` prefix and map to standard fields:
- `$email`, `$full_name`, `$first_name`, `$last_name`
- `$phone`, `$company`, `$job_title`, `$avatar_url`

Custom properties don't need a prefix:
- `subscription_plan`, `lifetime_value`, `last_login`

## Batching

Events are automatically batched for performance:
- Batches send when reaching `batchSize` (default: 100)
- Auto-flush every `flushInterval` ms (default: 5000)
- Max 1000 events per batch (automatically split if larger)

## Error Handling

The SDK includes automatic retry with exponential backoff:

```javascript
try {
  await yorin.track('purchase', 'user_123', { amount: 100 });
} catch (error) {
  console.error('Failed to track event:', error);
}
```

## TypeScript Support

Full TypeScript support with type definitions included:

```typescript
import { Yorin, YorinConfig, ServerEvent, IdentifyProperties } from 'yorin-nodejs';

const config: YorinConfig = {
  secretKey: 'sk_your_key',
  debug: true
};

const yorin = new Yorin(config);

const properties: IdentifyProperties = {
  $email: 'user@example.com',
  $full_name: 'John Doe'
};

await yorin.identify('user_123', properties);
```

## License

MIT

## Support

- Documentation: [https://docs.yorin.io](https://docs.yorin.io)
- Issues: [GitHub Issues](https://github.com/YorinLabs/yorin-nodejs/issues)
- Email: support@yorin.io