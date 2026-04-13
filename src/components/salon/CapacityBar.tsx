/**
 * TrimCity — Capacity Bar
 * Visual bar showing occupancy: green=low, yellow=mid, red=full
 */
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { Colors, Radius, Typography } from '../../constants/theme';

interface CapacityBarProps {
  seated: number;
  total: number;
  showLabel?: boolean;
  height?: number;
}

function getCapacityColor(percent: number): string {
  if (percent >= 90) return Colors.full;
  if (percent >= 60) return Colors.busy;
  return Colors.available;
}

export function CapacityBar({
  seated,
  total,
  showLabel = true,
  height = 6,
}: CapacityBarProps) {
  const percent = total > 0 ? Math.min(100, (seated / total) * 100) : 0;
  const widthAnim = useRef(new Animated.Value(0)).current;
  const color = getCapacityColor(percent);

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: percent,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View>
      <View style={[styles.track, { height }]}>
        <Animated.View
          style={[
            styles.fill,
            { width: animatedWidth, backgroundColor: color, height },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={[styles.label, { color }]}>
          {seated}/{total} seats
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: Radius.full,
  },
  label: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    marginTop: 4,
  },
});
