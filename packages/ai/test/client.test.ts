import { describe, expect, it } from "vitest";
import { museClient, modelId, fallbackModelId } from "../src/client.js";

describe("muse client config", () => {
  it("defaults to muse-spark-1.3 with 1.2 fallback", () => {
    expect(modelId()).toBe("muse-spark-1.3");
    expect(fallbackModelId()).toBe("muse-spark-1.2");
  });

  it("throws a clear error without MODEL_API_KEY", () => {
    const prev = process.env.MODEL_API_KEY;
    delete process.env.MODEL_API_KEY;
    // Reset the cached singleton via a fresh key state.
    expect(() => museClient()).toThrow(/MODEL_API_KEY/);
    if (prev !== undefined) process.env.MODEL_API_KEY = prev;
  });
});
