import { BodyRegion } from "@paintrack/core/model";
import { describe, expect, it } from "vitest";
import { AREA_BY_KEY, AREAS, describeLocation, VIEWBOX } from "../src/body/regions";

describe("body map", () => {
  it("has unique keys and every area uses a valid region", () => {
    const all = [...AREAS.front, ...AREAS.back];
    expect(new Set(all.map((a) => a.key)).size).toBe(all.length);
    expect(AREA_BY_KEY.size).toBe(all.length);
    for (const area of all) expect(BodyRegion.options).toContain(area.region);
  });

  it("puts the patient's right on the viewer's left on the front view, and on the right on the back", () => {
    const frontRightKnee = AREA_BY_KEY.get("front:knee:right")!;
    const backRightKnee = AREA_BY_KEY.get("back:knee:right")!;
    const cx = (s: typeof frontRightKnee.shape) => (s.type === "ellipse" ? s.cx : s.x + s.width / 2);
    expect(cx(frontRightKnee.shape)).toBeLessThan(VIEWBOX.width / 2);
    expect(cx(backRightKnee.shape)).toBeGreaterThan(VIEWBOX.width / 2);
  });

  it("keeps every shape inside the drawing", () => {
    for (const area of [...AREAS.front, ...AREAS.back]) {
      const s = area.shape;
      const [x0, y0, x1, y1] =
        s.type === "ellipse" ? [s.cx - s.rx, s.cy - s.ry, s.cx + s.rx, s.cy + s.ry] : [s.x, s.y, s.x + s.width, s.y + s.height];
      expect(x0).toBeGreaterThanOrEqual(0);
      expect(y0).toBeGreaterThanOrEqual(0);
      expect(x1).toBeLessThanOrEqual(VIEWBOX.width);
      expect(y1).toBeLessThanOrEqual(VIEWBOX.height);
    }
  });

  it("only shows front-only and back-only regions on the right view", () => {
    expect(AREAS.front.some((a) => a.region === "chest")).toBe(true);
    expect(AREAS.back.some((a) => a.region === "chest")).toBe(false);
    expect(AREAS.back.some((a) => a.region === "lower_back")).toBe(true);
    expect(AREAS.front.some((a) => a.region === "lower_back")).toBe(false);
  });

  it("describes locations in plain words", () => {
    expect(describeLocation({ region: "knee", side: "left", surface: "back" })).toBe("Left knee (back)");
    expect(describeLocation({ region: "lower_back", side: "midline", surface: "back" })).toBe("Lower back");
  });
});
