import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';

function hexPoints(w: number, h: number, inset: number) {
  return [
    [w / 2, inset],
    [w - inset, h * 0.25 + inset / 2],
    [w - inset, h * 0.75 - inset / 2],
    [w / 2, h - inset],
    [inset, h * 0.75 - inset / 2],
    [inset, h * 0.25 + inset / 2],
  ]
    .map((point) => point.join(','))
    .join(' ');
}

/** Gold hexagon badge with the badge emoji in the middle; greyed out while locked. */
export function HexBadge({ icon, size = 56, locked = false }: { icon: string; size?: number; locked?: boolean }) {
  const w = size;
  const h = size * 1.1;
  const id = locked ? 'hexLocked' : 'hexGold';
  return (
    <View style={{ width: w, height: h }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={locked ? '#DCE2DE' : '#F7C863'} />
            <Stop offset="1" stopColor={locked ? '#B8C1BC' : '#C47F1E'} />
          </LinearGradient>
        </Defs>
        <Polygon points={hexPoints(w, h, 1)} fill={`url(#${id})`} />
        <Polygon points={hexPoints(w, h, size * 0.12)} fill={locked ? '#F1F4F2' : '#24473A'} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={{ fontSize: size * 0.34, opacity: locked ? 0.5 : 1 }}>{locked ? '🔒' : icon}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
