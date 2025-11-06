import { Yorin } from "../src/index";

// Mock timers for batching tests
jest.useFakeTimers();

describe("Yorin SDK", () => {
  let yorin: Yorin;
  const mockSecretKey = "sk_test_123456789";
  const mockApiUrl = "https://test.yorin.io";

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Event tracked successfully",
      }),
      text: async () => "Success",
    });

    yorin = new Yorin({
      secretKey: mockSecretKey,
      apiUrl: mockApiUrl,
      debug: false,
      enableBatching: false, // Disable batching for simpler testing
    });
  });

  afterEach(() => {
    yorin.destroy();
    jest.clearAllTimers();
  });

  describe("Constructor", () => {
    it("should initialize with valid config", () => {
      const testYorin = new Yorin({
        secretKey: "sk_valid_key",
        apiUrl: "https://valid.url.com",
      });
      expect(testYorin).toBeDefined();
      testYorin.destroy();
    });

    it("should throw error for missing secret key", () => {
      expect(() => new Yorin()).toThrow("Yorin secret key is required");
    });

    it("should throw error for invalid secret key format", () => {
      expect(() => new Yorin({ secretKey: "invalid_key" })).toThrow(
        "Invalid secret key format",
      );
    });

    it("should throw error for invalid API URL", () => {
      expect(
        () =>
          new Yorin({
            secretKey: "sk_valid_key",
            apiUrl: "not-a-url",
          }),
      ).toThrow("Invalid API URL format");
    });

    it("should use environment variables when config not provided", () => {
      process.env.YORIN_SECRET_KEY = "sk_env_key";
      process.env.YORIN_API_URL = "https://env.yorin.io";

      const yorinFromEnv = new Yorin();
      expect(yorinFromEnv).toBeDefined();

      // Clean up
      delete process.env.YORIN_SECRET_KEY;
      delete process.env.YORIN_API_URL;
      yorinFromEnv.destroy();
    });
  });

  describe("Contact Management", () => {
    it("should add or update contact", async () => {
      await yorin.addOrUpdateContact("user_123", {
        $email: "test@example.com",
        $full_name: "Test User",
        $company: "Test Corp",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/v1/events`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockSecretKey}`,
          }),
          body: expect.stringContaining('"event_name":"addOrUpdateContact"'),
        }),
      );
    });

    it("should delete contact", async () => {
      await yorin.deleteContact("user_123");

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/v1/events`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"event_name":"deleteContact"'),
        }),
      );
    });

    it("should include options in contact operations", async () => {
      const options = {
        anonymousUserId: "anon_123",
        sessionId: "session_456",
        timestamp: new Date().toISOString(),
      };

      await yorin.addOrUpdateContact(
        "user_123",
        {
          $email: "test@example.com",
        },
        options,
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.anonymous_user_id).toBe(options.anonymousUserId);
      expect(requestBody.session_id).toBe(options.sessionId);
      expect(requestBody.timestamp).toBe(options.timestamp);
    });
  });

  describe("Group Management", () => {
    it("should add or update group", async () => {
      await yorin.addOrUpdateGroup("group_123", "user_123", {
        $name: "Test Company",
        $industry: "Technology",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/v1/events`,
        expect.objectContaining({
          body: expect.stringContaining('"event_name":"addOrUpdateGroup"'),
        }),
      );
    });

    it("should delete group", async () => {
      await yorin.deleteGroup("group_123", "user_123");

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/v1/events`,
        expect.objectContaining({
          body: expect.stringContaining('"event_name":"deleteGroup"'),
        }),
      );
    });

    it("should handle group operations without user ID", async () => {
      await yorin.addOrUpdateGroup("group_123", undefined, {
        $name: "Test Company",
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.user_id).toBeUndefined();
      expect(requestBody.properties.group_id).toBe("group_123");
    });
  });

  describe("Payment Tracking", () => {
    it("should track payment", async () => {
      const paymentProperties = {
        payment_id: "pay_123",
        amount: 99.99,
        currency: "USD",
        payment_method: "credit_card",
        payment_status: "completed" as const,
        product_id: "prod_premium",
      };

      await yorin.payment("user_123", paymentProperties);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/v1/events`,
        expect.objectContaining({
          body: expect.stringContaining('"event_name":"$payments"'),
        }),
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.properties.$transaction_id).toBe("pay_123");
      expect(requestBody.properties.$amount).toBe(99.99);
      expect(requestBody.properties.$status).toBe("completed");
    });

    it("should include payment options", async () => {
      const paymentProperties = {
        payment_id: "pay_123",
        amount: 50.0,
        currency: "USD",
        payment_status: "completed" as const,
      };

      const options = {
        anonymousUserId: "anon_123",
        timestamp: new Date().toISOString(),
      };

      await yorin.payment("user_123", paymentProperties, options);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.anonymous_user_id).toBe(options.anonymousUserId);
      expect(requestBody.timestamp).toBe(options.timestamp);
    });
  });

  describe("Subscription Tracking", () => {
    it("should track contact subscription", async () => {
      const subscriptionProperties = {
        plan_id: "plan_premium",
        plan_name: "Premium Plan",
        status: "active" as const,
        subscriber_type: "contact" as const,
        amount: 29.99,
        currency: "USD",
      };

      await yorin.subscription(subscriptionProperties, {
        userId: "user_123",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/v1/events`,
        expect.objectContaining({
          body: expect.stringContaining('"event_name":"subscription"'),
        }),
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.properties.$plan_name).toBe("Premium Plan");
      expect(requestBody.properties.$plan).toBe("Premium Plan");
      expect(requestBody.properties.$subscriber_type).toBe("contact");
      expect(requestBody.user_id).toBe("user_123");
    });

    it("should track group subscription", async () => {
      const subscriptionProperties = {
        plan_id: "plan_enterprise",
        status: "active" as const,
        subscriber_type: "group" as const,
        subscriber_id: "group_123",
      };

      await yorin.subscription(subscriptionProperties, {
        groupId: "group_123",
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.properties.$subscriber_type).toBe("group");
      expect(requestBody.properties.$subscriber_id).toBe("group_123");
    });
  });

  describe("General Tracking", () => {
    it("should track custom events", async () => {
      await yorin.track("custom_event", "user_123", {
        property1: "value1",
        property2: 42,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/v1/events`,
        expect.objectContaining({
          body: expect.stringContaining('"event_name":"custom_event"'),
        }),
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.user_id).toBe("user_123");
      expect(requestBody.properties.property1).toBe("value1");
      expect(requestBody.properties.property2).toBe(42);
    });

    it("should track page views", async () => {
      await yorin.page(
        "Dashboard",
        "user_123",
        {
          section: "analytics",
        },
        {
          url: "https://app.example.com/dashboard",
          title: "Analytics Dashboard",
        },
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockApiUrl}/v1/events`,
        expect.objectContaining({
          body: expect.stringContaining('"event_name":"page"'),
        }),
      );

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.properties.name).toBe("Dashboard");
      expect(requestBody.page_url).toBe("https://app.example.com/dashboard");
      expect(requestBody.page_title).toBe("Analytics Dashboard");
    });

    it("should handle track events without user ID but with group_id", async () => {
      await yorin.track("group_event", undefined, {
        group_id: "group_123",
        action: "upgraded",
      });

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.user_id).toBeUndefined();
      expect(requestBody.properties.group_id).toBe("group_123");
    });
  });

  describe("Batch Operations", () => {
    beforeEach(() => {
      // Create yorin with batching enabled
      yorin.destroy();
      yorin = new Yorin({
        secretKey: mockSecretKey,
        apiUrl: mockApiUrl,
        debug: false,
        enableBatching: true,
        batchSize: 3,
        flushInterval: 1000,
      });
    });

    afterEach(() => {
      // Ensure cleanup for batch-enabled instance
      yorin.destroy();
    });

    it("should send events in batches", async () => {
      // Send 3 events to trigger batch
      await yorin.track("event1", "user_1");
      await yorin.track("event2", "user_2");
      await yorin.track("event3", "user_3"); // This should trigger the batch

      expect(global.fetch).toHaveBeenCalledTimes(1);

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(Array.isArray(requestBody)).toBe(true);
      expect(requestBody).toHaveLength(3);
    });

    it("should flush batch manually", async () => {
      await yorin.track("event1", "user_1");
      await yorin.track("event2", "user_2");

      // Should not have sent yet (batch size is 3)
      expect(global.fetch).toHaveBeenCalledTimes(0);

      await yorin.flush();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(Array.isArray(requestBody)).toBe(true);
      expect(requestBody).toHaveLength(2);
    });

    it.skip("should auto-flush on timer", async () => {
      await yorin.track("event1", "user_1");

      // Should not have sent yet
      expect(global.fetch).toHaveBeenCalledTimes(0);

      // Fast-forward timer
      jest.advanceTimersByTime(1000);

      // Wait for async operations
      await new Promise((resolve) => setImmediate(resolve));

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should send large batches in chunks", async () => {
      const events = Array.from({ length: 1500 }, (_, i) => ({
        event_name: `event_${i}`,
        user_id: `user_${i}`,
        properties: { index: i },
      }));

      await yorin.trackBatch(events);

      // Should split into 2 batches (1000 + 500)
      expect(global.fetch).toHaveBeenCalledTimes(2);

      const firstBatch = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      const secondBatch = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[1][1].body,
      );

      expect(firstBatch).toHaveLength(1000);
      expect(secondBatch).toHaveLength(500);
    });
  });
});
