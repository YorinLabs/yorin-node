import { YorinClient, type ClientConfig } from "../src/core/client";
import type { ServerEvent } from "../src/types";

// Mock timers
jest.useFakeTimers();

describe("YorinClient", () => {
  let client: YorinClient;
  let config: ClientConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    config = {
      secretKey: "sk_test_123",
      apiUrl: "https://test.yorin.io",
      debug: false,
      batchSize: 3,
      flushInterval: 1000,
      enableBatching: true,
      retryAttempts: 3,
      retryDelay: 1000,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: "Success" }),
      text: async () => "Success",
    });

    client = new YorinClient(config);
  });

  afterEach(() => {
    client.destroy();
    jest.clearAllTimers();
  });

  describe("Constructor", () => {
    it("should initialize with config", () => {
      expect(client).toBeDefined();
    });

    it("should initialize with batching enabled", () => {
      expect(client).toBeDefined();
      expect(client.getBatchSize()).toBe(0);
    });

    it("should handle batching disabled", () => {
      const noBatchConfig = { ...config, enableBatching: false };
      const noBatchClient = new YorinClient(noBatchConfig);

      expect(noBatchClient).toBeDefined();
      expect(noBatchClient.getBatchSize()).toBe(0);

      noBatchClient.destroy();
    });
  });

  describe("sendEvent", () => {
    const mockEvent: ServerEvent = {
      event_name: "test_event",
      user_id: "user_123",
      properties: { test: "value" },
      timestamp: new Date().toISOString(),
    };

    it("should queue event when batching enabled", async () => {
      await client.sendEvent(mockEvent);

      // Should not send immediately
      expect(global.fetch as jest.Mock).not.toHaveBeenCalled();
    });

    it("should send event immediately when batching disabled", async () => {
      client.destroy();
      const noBatchConfig = { ...config, enableBatching: false };
      const noBatchClient = new YorinClient(noBatchConfig);

      await noBatchClient.sendEvent(mockEvent);

      expect(global.fetch as jest.Mock).toHaveBeenCalledTimes(1);
      expect(global.fetch as jest.Mock).toHaveBeenCalledWith(
        `${config.apiUrl}/v1/events`,
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.secretKey}`,
          },
          body: JSON.stringify(mockEvent),
        }),
      );

      noBatchClient.destroy();
    });

    it("should flush batch when batch size reached", async () => {
      // Send events up to batch size
      for (let i = 0; i < config.batchSize; i++) {
        await client.sendEvent({
          ...mockEvent,
          user_id: `user_${i}`,
        });
      }

      expect(global.fetch as jest.Mock).toHaveBeenCalledTimes(1);

      const requestBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(Array.isArray(requestBody)).toBe(true);
      expect(requestBody).toHaveLength(config.batchSize);
    });
  });

  describe("sendBatch", () => {
    const mockEvents: ServerEvent[] = [
      {
        event_name: "event1",
        user_id: "user_1",
        properties: {},
        timestamp: new Date().toISOString(),
      },
      {
        event_name: "event2",
        user_id: "user_2",
        properties: {},
        timestamp: new Date().toISOString(),
      },
    ];

    it("should send batch of events", async () => {
      await client.sendBatch(mockEvents);

      expect(global.fetch as jest.Mock).toHaveBeenCalledTimes(1);

      const requestBody = JSON.parse(
        (global.fetch as jest.Mock).mock.calls[0][1].body,
      );
      expect(Array.isArray(requestBody)).toBe(true);
      expect(requestBody).toHaveLength(2);
    });

    it("should handle empty batch gracefully", async () => {
      await client.sendBatch([]);

      expect(global.fetch as jest.Mock).not.toHaveBeenCalled();
    });

    it("should split large batches into chunks", async () => {
      const largeEventArray = Array.from({ length: 1500 }, (_, i) => ({
        event_name: `event_${i}`,
        user_id: `user_${i}`,
        properties: {},
        timestamp: new Date().toISOString(),
      }));

      await client.sendBatch(largeEventArray);

      // Should be split into 2 calls (1000 + 500)
      expect(global.fetch as jest.Mock).toHaveBeenCalledTimes(2);

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

  describe("flush", () => {
    it("should flush pending events", async () => {
      const mockEvent: ServerEvent = {
        event_name: "test_event",
        user_id: "user_123",
        properties: {},
        timestamp: new Date().toISOString(),
      };

      await client.sendEvent(mockEvent);

      // Should not have sent yet
      expect(global.fetch as jest.Mock).not.toHaveBeenCalled();

      await client.flush();

      expect(global.fetch as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it("should handle flush with no pending events", async () => {
      await client.flush();

      expect(global.fetch as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe("Auto-flush timer", () => {
    it.skip("should auto-flush on timer interval", async () => {
      const mockEvent: ServerEvent = {
        event_name: "test_event",
        user_id: "user_123",
        properties: {},
        timestamp: new Date().toISOString(),
      };

      await client.sendEvent(mockEvent);

      // Should not have sent yet
      expect(global.fetch as jest.Mock).not.toHaveBeenCalled();

      // Fast-forward timer
      jest.advanceTimersByTime(config.flushInterval);

      // Wait for async operations
      await new Promise((resolve) => setImmediate(resolve));

      expect(global.fetch as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it.skip("should not auto-flush when no events queued", async () => {
      // Fast-forward timer
      jest.advanceTimersByTime(config.flushInterval);

      // Wait for async operations
      await new Promise((resolve) => setImmediate(resolve));

      expect(global.fetch as jest.Mock).not.toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("should handle HTTP errors", async () => {
      // Create client with batching disabled and no retries for immediate error
      const noBatchClient = new YorinClient({
        ...config,
        enableBatching: false,
        retryAttempts: 1,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Bad Request",
      });

      const mockEvent: ServerEvent = {
        event_name: "test_event",
        user_id: "user_123",
        properties: {},
        timestamp: new Date().toISOString(),
      };

      await expect(noBatchClient.sendEvent(mockEvent)).rejects.toThrow(
        "HTTP 400: Bad Request",
      );

      noBatchClient.destroy();
    });

    it("should handle API response errors", async () => {
      // Create client with batching disabled and no retries
      const noBatchClient = new YorinClient({
        ...config,
        enableBatching: false,
        retryAttempts: 1,
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, message: "Invalid event" }),
        text: async () => "Success",
      });

      const mockEvent: ServerEvent = {
        event_name: "test_event",
        user_id: "user_123",
        properties: {},
        timestamp: new Date().toISOString(),
      };

      await expect(noBatchClient.sendEvent(mockEvent)).rejects.toThrow(
        "Invalid event",
      );

      noBatchClient.destroy();
    });

    it("should retry on failure", async () => {
      // First two calls fail, third succeeds
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
          text: async () => "Success",
        });

      const mockEvent: ServerEvent = {
        event_name: "test_event",
        user_id: "user_123",
        properties: {},
        timestamp: new Date().toISOString(),
      };

      // Disable batching for this test
      client.destroy();
      const retryClient = new YorinClient({
        ...config,
        enableBatching: false,
        retryAttempts: 3,
      });

      await retryClient.sendEvent(mockEvent);

      expect(global.fetch as jest.Mock).toHaveBeenCalledTimes(3);

      retryClient.destroy();
    });

    it("should fail after max retries", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const mockEvent: ServerEvent = {
        event_name: "test_event",
        user_id: "user_123",
        properties: {},
        timestamp: new Date().toISOString(),
      };

      // Disable batching for this test
      client.destroy();
      const retryClient = new YorinClient({
        ...config,
        enableBatching: false,
        retryAttempts: 2,
      });

      await expect(retryClient.sendEvent(mockEvent)).rejects.toThrow(
        "Network error",
      );

      expect(global.fetch as jest.Mock).toHaveBeenCalledTimes(2);

      retryClient.destroy();
    });
  });

  describe("destroy", () => {
    it.skip("should clear timer and flush events", async () => {
      const mockEvent: ServerEvent = {
        event_name: "test_event",
        user_id: "user_123",
        properties: {},
        timestamp: new Date().toISOString(),
      };

      await client.sendEvent(mockEvent);

      client.destroy();

      expect(client.getBatchSize()).toBe(0);

      // Should have flushed the pending event
      await new Promise((resolve) => setImmediate(resolve));
      expect(global.fetch as jest.Mock).toHaveBeenCalledTimes(1);
    });
  });
});
