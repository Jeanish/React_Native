/**
 * A Pressable that scales down on press with a spring-back release.
 * Use this instead of TouchableOpacity for tactile, consistent button feedback.
 */
import React, { useRef } from 'react';
import { Animated, Pressable, PressableProps, ViewStyle, StyleProp } from 'react-native';

interface Props extends PressableProps {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}

export function AnimatedPressable({ style, scaleTo = 0.96, children, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start();

  return (
    <Pressable onPressIn={pressIn} onPressOut={pressOut} {...rest}>
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children as any}</Animated.View>
    </Pressable>
  );
}
