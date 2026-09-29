import React, { useEffect, useRef, useState } from 'react';
import {
  Text, TextStyle, StyleSheet,
  Animated, Easing, ViewStyle,
} from 'react-native';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  delay?: number;
  style?: TextStyle;
  suffix?: string;
  format?: (n: number) => string;
}

export function AnimatedNumber({
  value,
  duration = 600,
  delay = 0,
  style,
  suffix = '',
  format,
}: AnimatedNumberProps) {
  const animValue = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(animValue, {
        toValue: value,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const id = animValue.addListener(({ value: v }) => {
      setDisplay(Math.round(v));
    });
    return () => animValue.removeListener(id);
  }, []);

  const formatted = format ? format(display) : `${display}${suffix}`;

  return (
    <Animated.Text style={[styles.default, style]}>
      {formatted}
    </Animated.Text>
  );
}

interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
  direction?: 'up' | 'down' | 'none';
}

export function FadeInView({
  children,
  delay = 0,
  duration = 400,
  style,
  direction = 'up',
}: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(
    direction === 'up' ? 20 : direction === 'down' ? -20 : 0
  )).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

interface ScalePressProps {
  children: React.ReactNode;
  onPress?: () => void;
  scaleTo?: number;
  style?: ViewStyle;
}

export function ScalePress({ children, onPress, scaleTo = 0.96, style }: ScalePressProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    onPress?.();
  };

  return (
    <Animated.View
      style={[{ transform: [{ scale }] }, style]}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  default: {
    fontVariant: ['tabular-nums'],
  },
});