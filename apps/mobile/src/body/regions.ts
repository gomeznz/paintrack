import type { BodyRegion, PainLocation } from "@paintrack/core/model";

/**
 * Simple front/back body outline made of tappable shapes, in a 200×400
 * viewBox. Shapes are defined once for the viewer's left half and mirrored.
 *
 * Side is always the PATIENT's side. On the front view the patient faces
 * the viewer, so the viewer's left is the patient's right; on the back view
 * they match.
 */

export type Surface = PainLocation["surface"];
export type Side = PainLocation["side"];

export type Shape =
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { type: "rect"; x: number; y: number; width: number; height: number; r: number };

export interface MapArea {
  key: string;
  region: BodyRegion;
  side: Side;
  surface: Surface;
  shape: Shape;
}

export const VIEWBOX = { width: 200, height: 400 } as const;

type Template = { region: BodyRegion; shape: Shape; surfaces?: Surface[] };

const e = (cx: number, cy: number, rx: number, ry: number): Shape => ({ type: "ellipse", cx, cy, rx, ry });
const r = (x: number, y: number, width: number, height: number, radius = 6): Shape => ({
  type: "rect",
  x,
  y,
  width,
  height,
  r: radius,
});

/** Centre-line areas, not mirrored. */
const MIDLINE: Template[] = [
  { region: "head", shape: e(100, 32, 22, 26) },
  { region: "neck", shape: r(91, 58, 18, 16, 4) },
  { region: "chest", shape: r(78, 76, 44, 46), surfaces: ["front"] },
  { region: "abdomen", shape: r(80, 124, 40, 40), surfaces: ["front"] },
  { region: "pelvis", shape: r(80, 166, 40, 22), surfaces: ["front"] },
  { region: "upper_back", shape: r(78, 76, 44, 30), surfaces: ["back"] },
  { region: "mid_back", shape: r(79, 108, 42, 26), surfaces: ["back"] },
  { region: "lower_back", shape: r(80, 136, 40, 28), surfaces: ["back"] },
];

/** Areas on the viewer's left half; mirrored to make the other side. */
const LATERAL: Template[] = [
  { region: "shoulder", shape: e(66, 84, 14, 11) },
  { region: "upper_arm", shape: r(50, 96, 17, 50) },
  { region: "elbow", shape: e(57, 154, 9, 8) },
  { region: "forearm", shape: r(46, 163, 16, 46) },
  { region: "wrist", shape: e(52, 214, 8, 5) },
  { region: "hand", shape: e(50, 232, 10, 13) },
  { region: "hip", shape: e(72, 176, 8, 13), surfaces: ["front"] },
  { region: "buttock", shape: r(80, 166, 19, 30, 9), surfaces: ["back"] },
  { region: "thigh", shape: r(80, 198, 19, 68) },
  { region: "knee", shape: e(89, 276, 10, 10) },
  { region: "lower_leg", shape: r(81, 288, 16, 68) },
  { region: "ankle", shape: e(89, 362, 8, 5) },
  { region: "foot", shape: e(88, 378, 12, 8) },
];

function mirror(shape: Shape): Shape {
  return shape.type === "ellipse"
    ? { ...shape, cx: VIEWBOX.width - shape.cx }
    : { ...shape, x: VIEWBOX.width - shape.x - shape.width };
}

export function areaKey(surface: Surface, region: BodyRegion, side: Side): string {
  return `${surface}:${region}:${side}`;
}

function build(surface: Surface): MapArea[] {
  const applies = (t: Template) => !t.surfaces || t.surfaces.includes(surface);
  // Viewer's left is the patient's right on the front view.
  const viewerLeft: Side = surface === "front" ? "right" : "left";
  const viewerRight: Side = surface === "front" ? "left" : "right";

  const areas: MapArea[] = [];
  for (const t of MIDLINE.filter(applies)) {
    areas.push({ key: areaKey(surface, t.region, "midline"), region: t.region, side: "midline", surface, shape: t.shape });
  }
  for (const t of LATERAL.filter(applies)) {
    areas.push({ key: areaKey(surface, t.region, viewerLeft), region: t.region, side: viewerLeft, surface, shape: t.shape });
    areas.push({
      key: areaKey(surface, t.region, viewerRight),
      region: t.region,
      side: viewerRight,
      surface,
      shape: mirror(t.shape),
    });
  }
  return areas;
}

export const AREAS: Record<Surface, MapArea[]> = { front: build("front"), back: build("back") };

export const AREA_BY_KEY: ReadonlyMap<string, MapArea> = new Map(
  [...AREAS.front, ...AREAS.back].map((a) => [a.key, a]),
);

const REGION_LABELS: Record<BodyRegion, string> = {
  head: "Head",
  face: "Face",
  jaw: "Jaw",
  neck: "Neck",
  shoulder: "Shoulder",
  upper_arm: "Upper arm",
  elbow: "Elbow",
  forearm: "Forearm",
  wrist: "Wrist",
  hand: "Hand",
  chest: "Chest",
  abdomen: "Abdomen",
  upper_back: "Upper back",
  mid_back: "Middle back",
  lower_back: "Lower back",
  pelvis: "Pelvis",
  hip: "Hip",
  buttock: "Buttock",
  groin: "Groin",
  thigh: "Thigh",
  knee: "Knee",
  lower_leg: "Lower leg",
  ankle: "Ankle",
  foot: "Foot",
};

/** "Left knee (back)", "Lower back", "Head (front)". */
export function describeLocation(loc: Pick<PainLocation, "region" | "side" | "surface">): string {
  const name = REGION_LABELS[loc.region];
  const sided = loc.side === "left" || loc.side === "right" ? `${cap(loc.side)} ${name.toLowerCase()}` : name;
  const needsSurface = (["head", "neck", "shoulder", "upper_arm", "elbow", "forearm", "wrist", "hand", "thigh", "knee", "lower_leg", "ankle", "foot"] as BodyRegion[]).includes(loc.region);
  return needsSurface ? `${sided} (${loc.surface})` : sided;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
