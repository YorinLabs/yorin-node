import {
  ContactManager,
  GroupManager,
  PaymentManager,
  SubscriptionManager,
  TrackingManager,
} from '../src/events';

describe('Event Managers', () => {
  describe('ContactManager', () => {
    it('should create addOrUpdateContact event', () => {
      const event = ContactManager.createAddOrUpdateContactEvent(
        'user_123',
        {
          $email: 'test@example.com',
          $full_name: 'Test User',
          $company: 'Test Corp'
        },
        {
          anonymousUserId: 'anon_123',
          sessionId: 'session_456'
        }
      );

      expect(event.event_name).toBe('addOrUpdateContact');
      expect(event.user_id).toBe('user_123');
      expect(event.properties!.$email).toBe('test@example.com');
      expect(event.properties!.$full_name).toBe('Test User');
      expect(event.properties!.$company).toBe('Test Corp');
      expect(event.anonymous_user_id).toBe('anon_123');
      expect(event.session_id).toBe('session_456');
      expect(event.timestamp).toBeDefined();
    });

    it('should create deleteContact event', () => {
      const event = ContactManager.createDeleteContactEvent(
        'user_123',
        {
          anonymousUserId: 'anon_123',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      );

      expect(event.event_name).toBe('deleteContact');
      expect(event.user_id).toBe('user_123');
      expect(event.properties).toEqual({});
      expect(event.anonymous_user_id).toBe('anon_123');
      expect(event.timestamp).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle undefined properties and options', () => {
      const event = ContactManager.createAddOrUpdateContactEvent('user_123');

      expect(event.event_name).toBe('addOrUpdateContact');
      expect(event.user_id).toBe('user_123');
      expect(event.properties).toEqual({});
      expect(event.anonymous_user_id).toBeUndefined();
      expect(event.session_id).toBeUndefined();
    });
  });

  describe('GroupManager', () => {
    it('should create addOrUpdateGroup event with user ID', () => {
      const event = GroupManager.createAddOrUpdateGroupEvent(
        'group_123',
        'user_456',
        {
          $name: 'Test Company',
          $industry: 'Technology',
          $size: '100'
        }
      );

      expect(event.event_name).toBe('addOrUpdateGroup');
      expect(event.user_id).toBe('user_456');
      expect(event.properties!.group_id).toBe('group_123');
      expect(event.properties!.$name).toBe('Test Company');
      expect(event.properties!.$industry).toBe('Technology');
      expect(event.properties!.$size).toBe('100');
    });

    it('should create addOrUpdateGroup event without user ID', () => {
      const event = GroupManager.createAddOrUpdateGroupEvent(
        'group_123',
        undefined,
        {
          $name: 'Test Company'
        }
      );

      expect(event.event_name).toBe('addOrUpdateGroup');
      expect(event.user_id).toBeUndefined();
      expect(event.properties!.group_id).toBe('group_123');
      expect(event.properties!.$name).toBe('Test Company');
    });

    it('should create deleteGroup event', () => {
      const event = GroupManager.createDeleteGroupEvent(
        'group_123',
        'user_456'
      );

      expect(event.event_name).toBe('deleteGroup');
      expect(event.user_id).toBe('user_456');
      expect(event.properties!.group_id).toBe('group_123');
    });

    it('should handle empty properties', () => {
      const event = GroupManager.createAddOrUpdateGroupEvent('group_123');

      expect(event.properties!.group_id).toBe('group_123');
      expect(Object.keys(event.properties!)).toHaveLength(1);
    });
  });

  describe('PaymentManager', () => {
    it('should create payment event', () => {
      const paymentProperties = {
        payment_id: 'pay_123',
        amount: 99.99,
        currency: 'USD',
        payment_method: 'credit_card',
        payment_status: 'completed' as const,
        product_id: 'prod_premium',
        stripe_session_id: 'cs_test_123'
      };

      const event = PaymentManager.createPaymentEvent(
        'user_123',
        paymentProperties,
        {
          anonymousUserId: 'anon_123',
          sessionId: 'session_456'
        }
      );

      expect(event.event_name).toBe('$payments');
      expect(event.user_id).toBe('user_123');
      expect(event.properties!.$transaction_id).toBe('pay_123');
      expect(event.properties!.$amount).toBe(99.99);
      expect(event.properties!.$currency).toBe('USD');
      expect(event.properties!.$payment_method).toBe('credit_card');
      expect(event.properties!.$status).toBe('completed');
      expect(event.properties!.stripe_session_id).toBe('cs_test_123');
      expect(event.anonymous_user_id).toBe('anon_123');
      expect(event.session_id).toBe('session_456');
    });

    it('should handle minimal payment properties', () => {
      const paymentProperties = {
        amount: 50.0,
        currency: 'USD',
        payment_status: 'pending' as const
      };

      const event = PaymentManager.createPaymentEvent(
        'user_123',
        paymentProperties
      );

      expect(event.properties!.$amount).toBe(50.0);
      expect(event.properties!.$currency).toBe('USD');
      expect(event.properties!.$status).toBe('pending');
    });

    it('should handle additional payment properties', () => {
      const paymentProperties = {
        amount: 199.99,
        currency: 'EUR',
        payment_status: 'refunded' as const,
        custom_field: 'custom_value',
        metadata: { key: 'value' }
      };

      const event = PaymentManager.createPaymentEvent(
        'user_123',
        paymentProperties
      );

      expect(event.properties!.custom_field).toBe('custom_value');
      expect(event.properties!.metadata).toEqual({ key: 'value' });
    });
  });

  describe('SubscriptionManager', () => {
    it('should create contact subscription event', () => {
      const subscriptionProperties = {
        plan_id: 'plan_premium',
        plan_name: 'Premium Plan',
        status: 'active' as const,
        subscriber_type: 'contact' as const,
        amount: 29.99,
        currency: 'USD',
        billing_cycle: 'monthly' as const
      };

      const event = SubscriptionManager.createSubscriptionEvent(
        subscriptionProperties,
        {
          userId: 'user_123',
          anonymousUserId: 'anon_123'
        }
      );

      expect(event.event_name).toBe('subscription');
      expect(event.user_id).toBe('user_123');
      expect(event.properties!.$plan_name).toBe('Premium Plan');
      expect(event.properties!.$plan).toBe('Premium Plan');
      expect(event.properties!.$status).toBe('active');
      expect(event.properties!.$subscriber_type).toBe('contact');
      expect(event.properties!.$subscriber_id).toBe('user_123');
      expect(event.anonymous_user_id).toBe('anon_123');
    });

    it('should create group subscription event', () => {
      const subscriptionProperties = {
        plan_id: 'plan_enterprise',
        status: 'active' as const,
        subscriber_type: 'group' as const,
        subscriber_id: 'group_123'
      };

      const event = SubscriptionManager.createSubscriptionEvent(
        subscriptionProperties,
        {
          groupId: 'group_123',
          sessionId: 'session_456'
        }
      );

      expect(event.event_name).toBe('subscription');
      expect(event.properties!.$subscriber_type).toBe('group');
      expect(event.properties!.$subscriber_id).toBe('group_123');
      expect(event.session_id).toBe('session_456');
    });

    it('should throw error for contact subscription without user ID', () => {
      const subscriptionProperties = {
        plan_id: 'plan_basic',
        status: 'trialing' as const,
        subscriber_type: 'contact' as const
      };

      expect(() => {
        SubscriptionManager.createSubscriptionEvent(subscriptionProperties);
      }).toThrow('userId is required for contact subscriptions');
    });

    it('should handle additional subscription properties', () => {
      const subscriptionProperties = {
        plan_id: 'plan_custom',
        status: 'past_due' as const,
        subscriber_type: 'contact' as const,
        trial_ends_at: '2024-12-31T23:59:59Z',
        seats: 10,
        custom_property: 'value'
      };

      const event = SubscriptionManager.createSubscriptionEvent(
        subscriptionProperties,
        { userId: 'user_123' }
      );

      expect(event.properties!.$trial_ends_at).toBe('2024-12-31T23:59:59Z');
      expect(event.properties!.seats).toBe(10);
      expect(event.properties!.custom_property).toBe('value');
    });
  });

  describe('TrackingManager', () => {
    it('should create track event', () => {
      const event = TrackingManager.createTrackEvent(
        'purchase_completed',
        'user_123',
        {
          product_id: 'prod_123',
          amount: 99.99,
          category: 'electronics'
        },
        {
          anonymousUserId: 'anon_123',
          sessionId: 'session_456'
        }
      );

      expect(event.event_name).toBe('purchase_completed');
      expect(event.user_id).toBe('user_123');
      expect(event.properties!.product_id).toBe('prod_123');
      expect(event.properties!.amount).toBe(99.99);
      expect(event.properties!.category).toBe('electronics');
      expect(event.anonymous_user_id).toBe('anon_123');
      expect(event.session_id).toBe('session_456');
    });

    it('should create track event without user ID', () => {
      const event = TrackingManager.createTrackEvent(
        'page_view',
        undefined,
        {
          group_id: 'group_123',
          page: '/dashboard',
          referrer: 'https://google.com'
        }
      );

      expect(event.event_name).toBe('page_view');
      expect(event.user_id).toBeUndefined();
      expect(event.properties!.group_id).toBe('group_123');
      expect(event.properties!.page).toBe('/dashboard');
    });

    it('should create page event', () => {
      const event = TrackingManager.createPageEvent(
        'Dashboard',
        'user_123',
        {
          section: 'analytics',
          features: ['charts', 'reports']
        },
        {
          url: 'https://app.example.com/dashboard',
          title: 'Analytics Dashboard',
          referrer: 'https://example.com'
        }
      );

      expect(event.event_name).toBe('page');
      expect(event.user_id).toBe('user_123');
      expect(event.properties!.name).toBe('Dashboard');
      expect(event.page_url).toBe('https://app.example.com/dashboard');
      expect(event.page_title).toBe('Analytics Dashboard');
      expect(event.referrer).toBe('https://example.com');
      expect(event.properties!.section).toBe('analytics');
      expect(event.properties!.features).toEqual(['charts', 'reports']);
    });

    it('should create page event with minimal parameters', () => {
      const event = TrackingManager.createPageEvent();

      expect(event.event_name).toBe('page');
      expect(event.user_id).toBeUndefined();
      expect(event.properties).toEqual({});
    });

    it('should handle page event with only URL option', () => {
      const event = TrackingManager.createPageEvent(
        undefined,
        undefined,
        {},
        {
          url: 'https://example.com/about'
        }
      );

      expect(event.page_url).toBe('https://example.com/about');
      expect(event.page_title).toBeUndefined();
    });

    it('should merge properties correctly', () => {
      const event = TrackingManager.createTrackEvent(
        'complex_event',
        'user_123',
        {
          nested: { object: { value: 'test' } },
          array: [1, 2, 3],
          string: 'text',
          number: 42,
          boolean: true
        }
      );

      expect(event.properties!.nested).toEqual({ object: { value: 'test' } });
      expect(event.properties!.array).toEqual([1, 2, 3]);
      expect(event.properties!.string).toBe('text');
      expect(event.properties!.number).toBe(42);
      expect(event.properties!.boolean).toBe(true);
    });
  });
});