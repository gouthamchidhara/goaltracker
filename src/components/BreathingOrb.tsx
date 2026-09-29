import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions,
  Animated, Easing,
} from 'react-native';

const { width } = Dimensions.get('window');

interface BreathingOrbProps {
  isActive: boolean;
  timeLeft: number; // seconds
  phase: 'in' | 'hold' | 'out';
  reduceMotion?: boolean;
}

export function BreathingOrb({ isActive, timeLeft, phase, reduceMotion }: BreathingOrbProps) {
  const scale = useRef(new Animated.Value(0.62)).current;
  const outerScale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (!isActive || reduceMotion) {
      Animated.timing(scale, { toValue: 0.8, duration: 300, useNativeDriver: true }).start();
      Animated.timing(outerScale, { toValue: 0.9, duration: 300, useNativeDriver: true }).start();
      return;
    }

    if (phase === 'in') {
      Animated.timing(scale, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
      Animated.timing(outerScale, { toValue: 1.1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
    } else if (phase === 'out') {
      Animated.timing(scale, { toValue: 0.62, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
      Animated.timing(outerScale, { toValue: 0.7, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
    }
  }, [phase, isActive, reduceMotion]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const phaseLabel = phase === 'in' ? 'Breathe in' : phase === 'hold' ? 'Hold' : 'Breathe out';

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.outerRing, { transform: [{ scale: outerScale }] }]} />
      <Animated.View style={[styles.midRing, { transform: [{ scale: outerScale }] }]} />
      <Animated.View style={[styles.orb, { transform: [{ scale }] }]}>
        <View style={styles.orbInner}>
          <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
          <Text style={styles.phaseLabel}>{phaseLabel}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

interface PulsingDotProps {
  color: string;
  size?: number;
  active?: boolean;
}

export function PulsingDot({ color: dotColor, size = 8, active = true }: PulsingDotProps) {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.5, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active]);

  return (
    <Animated.View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: dotColor },
        { transform: [{ scale: anim }], opacity: anim },
      ]}
    />
  );
}

const ORB_SIZE = width * 0.55;

const styles = StyleSheet.create({
  container: {
    width: ORB_SIZE * 1.3,
    height: ORB_SIZE * 1.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: ORB_SIZE * 1.25,
    height: ORB_SIZE * 1.25,
    borderRadius: ORB_SIZE * 0.625,
    backgroundColor: '#23405F',
    opacity: 0.3,
  },
  midRing: {
    position: 'absolute',
    width: ORB_SIZE * 1.1,
    height: ORB_SIZE * 1.1,
    borderRadius: ORB_SIZE * 0.55,
    backgroundColor: '#1A2A3E',
    opacity: 0.5,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    backgroundColor: '#1A2A3E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8CC4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  orbInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: {
    fontFamily: 'SpaceGrotesk_700',
    fontSize: 48,
    color: '#F2F1EE',
    fontVariant: ['tabular-nums'],
  },
  phaseLabel: {
    fontFamily: 'Manrope_600',
    fontSize: 15,
    color: '#8CC4FF',
    marginTop: 4,
  },
});