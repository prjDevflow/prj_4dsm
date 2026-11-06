import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { shapePaths } from './paths';

export type ShapeProps = {
  color: string;
  size?: number;
  /** Drawn centered over the shape (an icon, initials...). */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const createShape = (path: string, displayName: string) => {
  const ShapeComponent = ({ color, size = 100, children, style, testID }: ShapeProps) => (
    <View testID={testID} style={[styles.box, { width: size, height: size }, style]}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Path d={path} fill={color} />
      </Svg>
      {children}
    </View>
  );
  ShapeComponent.displayName = displayName;
  return ShapeComponent;
};

export const Cookie12 = createShape(shapePaths.cookie12, 'Cookie12');
export const Clover4 = createShape(shapePaths.clover4, 'Clover4');
export const Arch = createShape(shapePaths.arch, 'Arch');
export const Sun8 = createShape(shapePaths.sun8, 'Sun8');
export const Circle = createShape(shapePaths.circle, 'Circle');

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
