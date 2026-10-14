import { StyleSheet, Text, View } from "react-native";
import Svg, { Ellipse, Rect, Text as SvgText } from "react-native-svg";
import { AREAS, describeLocation, VIEWBOX, type MapArea, type Surface } from "../body/regions";
import { Chip, ChipRow, colors } from "./ui";

interface Props {
  surface: Surface;
  onSurfaceChange(surface: Surface): void;
  /** Area key → intensity (0–10) for areas the patient has selected. */
  selected: ReadonlyMap<string, number>;
  onToggle(area: MapArea): void;
}

export function BodyMap({ surface, onSurfaceChange, selected, onToggle }: Props) {
  // Labels for orientation: the patient's right is on the viewer's left on the front view.
  const [leftLabel, rightLabel] = surface === "front" ? ["R", "L"] : ["L", "R"];

  return (
    <View style={styles.wrap}>
      <ChipRow>
        <Chip label="Front" selected={surface === "front"} onPress={() => onSurfaceChange("front")} />
        <Chip label="Back" selected={surface === "back"} onPress={() => onSurfaceChange("back")} />
      </ChipRow>
      <Svg
        width="100%"
        height={360}
        viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
        accessibilityLabel={`Body map, ${surface} view. Tap an area where you have pain.`}
      >
        <SvgText x={14} y={24} fontSize={14} fill={colors.muted} fontWeight="600">
          {leftLabel}
        </SvgText>
        <SvgText x={VIEWBOX.width - 24} y={24} fontSize={14} fill={colors.muted} fontWeight="600">
          {rightLabel}
        </SvgText>
        {AREAS[surface].map((area) => {
          const intensity = selected.get(area.key);
          const isSelected = intensity !== undefined;
          const common = {
            fill: isSelected ? colors.scale[intensity] : "#E6E9EE",
            stroke: isSelected ? colors.text : "#A9B1BC",
            strokeWidth: isSelected ? 1.5 : 1,
            onPress: () => onToggle(area),
            accessible: true,
            accessibilityRole: "button" as const,
            accessibilityLabel: `${describeLocation(area)}${isSelected ? `, selected, pain ${intensity}` : ""}`,
          };
          const s = area.shape;
          return s.type === "ellipse" ? (
            <Ellipse key={area.key} {...common} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} />
          ) : (
            <Rect key={area.key} {...common} x={s.x} y={s.y} width={s.width} height={s.height} rx={s.r} ry={s.r} />
          );
        })}
      </Svg>
      <Text style={styles.hint}>
        Tap where it hurts. {surface === "front" ? "You're looking at the front of the body." : "You're looking at the back of the body."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, alignItems: "stretch" },
  hint: { fontSize: 14, color: colors.muted, textAlign: "center" },
});
