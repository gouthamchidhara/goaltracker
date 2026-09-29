import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { useGoalStore } from '@/features/goals/store';
import { color, font, fontSize, spacing, radius, accentText } from '@/theme/tokens';
import { ProgressRing } from '@/components/ProgressRing';
import { AnimatedNumber, FadeInView, ScalePress } from '@/components/AnimatedNumber';
import { v4 as uuid } from 'uuid';

const { width } = Dimensions.get('window');

export default function FocusScreen() {
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const db = useSQLiteContext();
  const { goals, loadAll, addEntry } = useGoalStore();

  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 min default
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  useFocusEffect(useCallback(() => { loadAll(db); }, [db]));

  const goal = goals.find(g => g.id === goalId);

  useEffect(() => {
    if (!isRunning || isPaused) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          handleFinish();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, isPaused]);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning(true);
  };

  const handlePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPaused(p => !p);
  };

  const handleFinish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRunning(false);
    setIsFinished(true);
    if (goal) {
      await addEntry(db, {
        id: uuid(),
        goalId: goal.id,
        kind: 'focus_session',
        at: new Date().toISOString(),
        durationSec: (25 * 60) - timeLeft,
      });
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = 1 - timeLeft / (25 * 60);

  if (isFinished) {
    return (
      <View style={styles.container}>
        <FadeInView delay={0} style={styles.finishWrap}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <Text style={styles.finishTitle}>Session complete</Text>
          <Text style={styles.finishSub}>25 minutes of focused work logged</Text>
          <View style={styles.xpBadge}>
            <Text style={styles.xpText}>+25 XP earned</Text>
          </View>
          <ScalePress onPress={() => router.back()}>
            <View style={styles.finishButton}>
              <Text style={styles.finishButtonText}>Back to goal</Text>
            </View>
          </ScalePress>
        </FadeInView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Focus session</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Goal name */}
        {goal && (
          <FadeInView delay={0}>
            <View style={styles.goalInfo}>
              <Text style={styles.goalEmoji}>{goal.emoji || '🎯'}</Text>
              <Text style={styles.goalName}>{goal.title}</Text>
            </View>
          </FadeInView>
        )}

        {/* Timer ring */}
        <FadeInView delay={200}>
          <View style={styles.timerSection}>
            <ProgressRing
              progress={progress}
              size={width * 0.65}
              strokeWidth={16}
              color={color.calm}
              delay={100}
            >
              <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
              <Text style={styles.timerLabel}>
                {isRunning ? (isPaused ? 'Paused' : 'Focusing') : 'Ready'}
              </Text>
            </ProgressRing>
          </View>
        </FadeInView>

        {/* Controls */}
        <FadeInView delay={300}>
          <View style={styles.controls}>
            {!isRunning ? (
              <ScalePress onPress={handleStart}>
                <View style={styles.startBtn}>
                  <Text style={styles.startBtnText}>Start focus session</Text>
                </View>
              </ScalePress>
            ) : (
              <View style={styles.runningControls}>
                <ScalePress onPress={handlePause}>
                  <View style={styles.pauseBtn}>
                    <Text style={styles.pauseBtnText}>{isPaused ? 'Resume' : 'Pause'}</Text>
                  </View>
                </ScalePress>
                <ScalePress onPress={handleFinish}>
                  <View style={styles.finishBtn}>
                    <Text style={styles.finishBtnText}>Finish</Text>
                  </View>
                </ScalePress>
              </View>
            )}
          </View>
        </FadeInView>

        {/* Session info */}
        <FadeInView delay={400}>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Pausing is allowed within a session. It never excuses a missed day.
            </Text>
          </View>
        </FadeInView>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1E33' },
  scroll: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 22, color: '#F2F1EE' },
  headerTitle: { fontFamily: font.bodyBold, fontSize: fontSize.h3, color: '#F2F1EE' },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  goalEmoji: { fontSize: 28 },
  goalName: {
    fontFamily: font.bodyBold, fontSize: fontSize.h2,
    color: '#F2F1EE',
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  timerText: {
    fontFamily: font.displayBold, fontSize: 48,
    color: '#F2F1EE',
  },
  timerLabel: {
    fontFamily: font.bodySemiBold, fontSize: fontSize.body,
    color: '#8CC4FF', marginTop: spacing.xs,
  },
  controls: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  startBtn: {
    backgroundColor: '#8CC4FF',
    borderRadius: radius.full,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md + 2,
    minWidth: width * 0.7,
    alignItems: 'center',
  },
  startBtnText: {
    fontFamily: font.bodyBold, fontSize: fontSize.h3,
    color: '#0B1E33',
  },
  runningControls: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pauseBtn: {
    flex: 1,
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#8CC4FF',
  },
  pauseBtnText: {
    fontFamily: font.bodyBold, fontSize: fontSize.body,
    color: '#8CC4FF',
  },
  finishBtn: {
    flex: 1,
    backgroundColor: '#2EC4A5',
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  finishBtnText: {
    fontFamily: font.bodyBold, fontSize: fontSize.body,
    color: '#071F1A',
  },
  infoCard: {
    backgroundColor: '#1A2A3E',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#23405F',
  },
  infoText: {
    fontFamily: font.body, fontSize: fontSize.label,
    color: '#8CC4FF', textAlign: 'center', lineHeight: 20,
  },
  finishWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  checkCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#2EC4A5',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  checkIcon: { fontSize: 40, color: '#071F1A' },
  finishTitle: {
    fontFamily: font.displayBold, fontSize: 32,
    color: '#F2F1EE', marginBottom: spacing.sm,
  },
  finishSub: {
    fontFamily: font.body, fontSize: fontSize.body,
    color: '#8CC4FF', textAlign: 'center', marginBottom: spacing.lg,
  },
  xpBadge: {
    backgroundColor: '#23405F',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginBottom: spacing.xxl,
  },
  xpText: {
    fontFamily: font.bodyBold, fontSize: fontSize.body,
    color: '#8CC4FF',
  },
  finishButton: {
    backgroundColor: '#8CC4FF',
    borderRadius: radius.full,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md + 2,
  },
  finishButtonText: {
    fontFamily: font.bodyBold, fontSize: fontSize.body,
    color: '#0B1E33',
  },
});