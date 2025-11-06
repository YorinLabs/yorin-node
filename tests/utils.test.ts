import {
  Logger,
  retryWithBackoff,
  validateSecretKey,
  chunkArray,
} from "../src/utils";

// Mock console methods
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  console.warn = originalWarn;
});

describe("Logger", () => {
  describe("with debug enabled", () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger(true);
    });

    it("should log messages when debug is enabled", () => {
      logger.log("test message", { data: "value" });

      expect(console.log).toHaveBeenCalledWith("[Yorin]", "test message", {
        data: "value",
      });
    });

    it("should log warnings when debug is enabled", () => {
      logger.warn("warning message");

      expect(console.warn).toHaveBeenCalledWith(
        "[Yorin Warning]",
        "warning message",
      );
    });

    it("should always log errors", () => {
      logger.error("error message");

      expect(console.error).toHaveBeenCalledWith(
        "[Yorin Error]",
        "error message",
      );
    });
  });

  describe("with debug disabled", () => {
    let logger: Logger;

    beforeEach(() => {
      logger = new Logger(false);
    });

    it("should not log messages when debug is disabled", () => {
      logger.log("test message");

      expect(console.log).not.toHaveBeenCalled();
    });

    it("should not log warnings when debug is disabled", () => {
      logger.warn("warning message");

      expect(console.warn).not.toHaveBeenCalled();
    });

    it("should always log errors even when debug is disabled", () => {
      logger.error("error message");

      expect(console.error).toHaveBeenCalledWith(
        "[Yorin Error]",
        "error message",
      );
    });
  });

  describe("default constructor", () => {
    it("should default to debug disabled", () => {
      const logger = new Logger();

      logger.log("test message");

      expect(console.log).not.toHaveBeenCalled();
    });
  });
});

describe("retryWithBackoff", () => {
  jest.useFakeTimers();

  afterEach(() => {
    jest.clearAllTimers();
  });

  it("should return result on first success", async () => {
    const mockFn = jest.fn().mockResolvedValue("success");

    const result = await retryWithBackoff(mockFn, 3, 1000);

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should retry on failure and eventually succeed", async () => {
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error("failure 1"))
      .mockRejectedValueOnce(new Error("failure 2"))
      .mockResolvedValueOnce("success");

    const resultPromise = retryWithBackoff(mockFn, 3, 1000);

    // Fast-forward through delays
    jest.runAllTimers();

    const result = await resultPromise;

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it("should respect exponential backoff delays", async () => {
    // Spy on the actual setTimeout
    const setTimeoutSpy = jest.spyOn(global, "setTimeout");

    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error("failure 1"))
      .mockRejectedValueOnce(new Error("failure 2"))
      .mockResolvedValueOnce("success");

    const resultPromise = retryWithBackoff(mockFn, 3, 1000);

    // Fast-forward through delays
    jest.runAllTimers();

    const result = await resultPromise;
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(3);

    // Clean up
    setTimeoutSpy.mockRestore();
  });

  it("should throw last error after max retries", async () => {
    const lastError = new Error("final failure");
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error("failure 1"))
      .mockRejectedValueOnce(new Error("failure 2"))
      .mockRejectedValueOnce(lastError);

    const resultPromise = retryWithBackoff(mockFn, 3, 1000);

    // Fast-forward through all delays
    jest.runAllTimers();

    await expect(resultPromise).rejects.toThrow("final failure");
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it("should use default parameters", async () => {
    const mockFn = jest.fn().mockResolvedValue("success");

    const result = await retryWithBackoff(mockFn);

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should handle zero retries", async () => {
    const error = new Error("immediate failure");
    const mockFn = jest.fn().mockRejectedValue(error);

    await expect(retryWithBackoff(mockFn, 0, 1000)).rejects.toThrow(
      "All retry attempts failed",
    );
    expect(mockFn).not.toHaveBeenCalled();
  });
});

describe("validateSecretKey", () => {
  it("should return true for valid secret keys", () => {
    expect(validateSecretKey("sk_test_123456789")).toBe(true);
    expect(validateSecretKey("sk_live_abcdefghijk")).toBe(true);
    expect(validateSecretKey("sk_")).toBe(true);
  });

  it("should return false for invalid secret keys", () => {
    expect(validateSecretKey("pk_test_123456789")).toBe(false);
    expect(validateSecretKey("invalid_key")).toBe(false);
    expect(validateSecretKey("sk")).toBe(false);
    expect(validateSecretKey("")).toBe(false);
  });

  it("should return false for non-string values", () => {
    expect(validateSecretKey(null as unknown as string)).toBe(false);
    expect(validateSecretKey(undefined as unknown as string)).toBe(false);
    expect(validateSecretKey(123 as unknown as string)).toBe(false);
    expect(validateSecretKey({} as unknown as string)).toBe(false);
  });
});

describe("chunkArray", () => {
  it("should split array into chunks of specified size", () => {
    const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const chunks = chunkArray(array, 3);

    expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
  });

  it("should handle arrays smaller than chunk size", () => {
    const array = [1, 2];
    const chunks = chunkArray(array, 5);

    expect(chunks).toEqual([[1, 2]]);
  });

  it("should handle arrays exactly divisible by chunk size", () => {
    const array = [1, 2, 3, 4, 5, 6];
    const chunks = chunkArray(array, 2);

    expect(chunks).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  it("should handle empty arrays", () => {
    const array: number[] = [];
    const chunks = chunkArray(array, 3);

    expect(chunks).toEqual([]);
  });

  it("should handle chunk size of 1", () => {
    const array = [1, 2, 3];
    const chunks = chunkArray(array, 1);

    expect(chunks).toEqual([[1], [2], [3]]);
  });

  it("should handle different data types", () => {
    const array = ["a", "b", "c", "d", "e"];
    const chunks = chunkArray(array, 2);

    expect(chunks).toEqual([["a", "b"], ["c", "d"], ["e"]]);
  });
});
