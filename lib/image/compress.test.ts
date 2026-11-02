import { describe, expect, it } from "vitest";
import { MAX_IMAGE_SIDE, fitWithin } from "./compress";

describe("fitWithin", () => {
  it("leaves small images alone", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("shrinks the longest side to 1600px and keeps the shape", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: MAX_IMAGE_SIDE, height: 1200 });
    expect(fitWithin(1170, 2532)).toEqual({ width: 739, height: MAX_IMAGE_SIDE });
  });

  it("never returns a zero size", () => {
    expect(fitWithin(10000, 1)).toEqual({ width: MAX_IMAGE_SIDE, height: 1 });
  });
});
