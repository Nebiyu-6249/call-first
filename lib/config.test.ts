import { describe, expect, it } from "vitest";
import { APP_NAME, DEFAULT_EMERGENCY_NUMBER, emergencyLine } from "./config";

describe("config", () => {
  it("uses the default emergency number when none is given", () => {
    expect(emergencyLine()).toContain(`call ${DEFAULT_EMERGENCY_NUMBER}`);
  });

  it("uses the circle's own emergency number when given", () => {
    expect(emergencyLine("112")).toContain("call 112");
  });

  it("names the product and never promises safety", () => {
    const line = emergencyLine();
    expect(line).toContain(APP_NAME);
    expect(line).toContain("not a guarantee");
  });
});
