import Svg, { Path } from 'react-native-svg';

/** Brand mark: two peaks over three Baltic waves. */
export function LogoMark({ size = 84, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size * 0.78} viewBox="0 0 100 78" accessibilityLabel="Baltic Challenges">
      <Path d="M8 46 L38 8 L52 26 L60 16 L92 46 Z" fill={color} />
      <Path d="M4 56 C16 50 26 50 38 56 C50 62 60 62 72 56 C82 51 90 51 96 54" stroke={color} strokeWidth={5} fill="none" strokeLinecap="round" />
      <Path d="M10 66 C22 60 32 60 44 66 C56 72 66 72 78 66 C86 62 92 62 96 64" stroke={color} strokeWidth={5} fill="none" strokeLinecap="round" />
      <Path d="M18 75 C28 70 38 70 50 75 C60 79 70 79 82 74" stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" />
    </Svg>
  );
}
