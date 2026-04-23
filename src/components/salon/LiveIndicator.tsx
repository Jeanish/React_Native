/**
 * TrimCity — Live Indicator
 * Pulsing green dot showing real-time data status.
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Text } from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/theme';

interface LiveIndicatorProps {
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function LiveIndicator({ showLabel = true, size = 'sm' }: LiveIndicatorProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulse]);

  const dotSize = size === 'sm' ? 8 : 10;

  return (
    <View style={styles.container}>
      <View style={[styles.dotWrapper, { width: dotSize * 2.5, height: dotSize * 2.5 }]}>
        <Animated.View
          style={[
            styles.pulse,
            {
              width: dotSize * 2,
              height: dotSize * 2,
              borderRadius: dotSize,
              transform: [{ scale: pulse }],
            },
          ]}
        />
        <View
          style={[
            styles.dot,
            { width: dotSize, height: dotSize, borderRadius: dotSize / 2 },
          ]}
        />
      </View>
      {showLabel && <Text style={styles.label}>LIVE</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    backgroundColor: Colors.livePulse,
    opacity: 0.25,
  },
  dot: {
    backgroundColor: Colors.livePulse,
  },
  label: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: Colors.livePulse,
    letterSpacing: 0.8,
  },
});
