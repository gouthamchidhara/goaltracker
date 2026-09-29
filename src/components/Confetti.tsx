import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, Text, Dimensions,
  Animated, Easing,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface ParticleProps {
  index: number;
  color: string;
  onComplete: () => void;
}

function Particle({ index, color, onComplete }: ParticleProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const angle = (index / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const distance = 100 + Math.random() * 200;
    const targetX = Math.cos(angle) * distance;
    const targetY = Math.sin(angle) * distance - 150 - Math.random() * 100;

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: targetX,
        duration: 800 + Math.random() * 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: targetY + 300,
        duration: 1200 + Math.random() * 300,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 1200,
        delay: 600 + index * 30,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.3,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start(() => onComplete());
  }, []);

  const shapes = ['●', '■', '▲', '★', '◆'];
  const shape = shapes[index % shapes.length];

  return (
    <Animated.Text
      style={[
        styles.particle,
        {
          color,
          opacity,
          transform: [
            { translateX },
            { translateY },
            { scale },
          ],
        },
      ]}
    >
      {shape}
    </Animated.Text>
  );
}

interface ConfettiProps {
  active: boolean;
  colors?: string[];
  onComplete?: () => void;
}

export function Confetti({
  active,
  colors = ['#F5A524', '#8B7CFF', '#2EC4A5', '#5B9DFF', '#FF6B8A', '#34D399'],
  onComplete,
}: ConfettiProps) {
  const [particles, setParticles] = useState<number[]>([]);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (active) {
      setParticles(Array.from({ length: 30 }, (_, i) => i));
      setCompletedCount(0);
    } else {
      setParticles([]);
    }
  }, [active]);

  const handleComplete = () => {
    setCompletedCount(prev => {
      const next = prev + 1;
      if (next >= particles.length && onComplete) {
        onComplete();
      }
      return next;
    });
  };

  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map(i => (
        <Particle
          key={i}
          index={i}
          color={colors[i % colors.length]}
          onComplete={handleComplete}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  particle: {
    position: 'absolute',
    fontSize: 16,
    fontWeight: 'bold',
  },
});