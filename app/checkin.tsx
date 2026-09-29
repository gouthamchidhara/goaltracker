// Complete rewrite: Check-in ritual with animated cards, XP badge, haptics
// Replaces placeholder implementation per spec §5.3 A

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useGoalStore } from '@/features/goals/store';
import { color, font, fontSize, spacing, radius, accentText } from '@/theme/tokens';
import { ProgressRing } from '@/components/ProgressRing';
import { AnimatedNumber, FadeInView, ScalePress } from '@/components/AnimatedNumber';
import type { Goal, Entry, EntryKind } from '@/db/types';
import { v4 as uuid } from 'uuid';
import { isToday } from '@/lib/dates';

const { width } = Dimensions.get('window');

export default function CheckinScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { goals, entries, loadAll, addEntry } = useGoalStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  useFocusEffect(useCallback(() => { loadAll(db); }, [db]));

  const activeGoals = goals.filter(g => !g.archivedAt);
  const dueGoals = activeGoals.filter(g => {
    const es = entries[g.id] ?? [];
    return !es.some(e => isToday(e.at) && (e.kind === 'checkin' || e.kind === 'increment'));
  });

  const currentGoal = dueGoals[currentIndex];
  const doneCount = activeGoals.length - dueGoals.length;

  const handleAnswer = async (kind: EntryKind) => {
    if (!currentGoal) return;
    Haptics.notificationAsync(
      kind === 'checkin' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
    await addEntry(db, { id: uuid(), goalId: currentGoal.id, kind, at: new Date().toISOString() });
    setXpEarned(prev => prev + (kind === 'checkin' ? 20 : 0));
    if (kind === 'slip') {
      router.push(`/comeback/${currentGoal.id}`);
      return;
    }
    if (currentIndex + 1 < dueGoals.length) setCurrentIndex(i => i + 1);
    else setCompleted(true);
  };

  if (completed) {
    return (
      <View style={styles.container}>
        <FadeInView delay={0} style={styles.finishWrap}>
          <View style={styles.checkCircle}><Text style={styles.checkIcon}>✓</Text></View>
          <Text style={styles.finishTitle}>Today is logged</Text>
          <Text style={styles.finishSub}>{doneCount + 1} of {activeGoals.length} goals done today</Text>
          {xpEarned > 0 && (
            <View style={styles.xpBadge}><Text style={styles.xpText}>+{xpEarned} XP earned</Text></View>
          )}
          <ScalePress onPress={() => router.back()}>
            <View style={styles.finishButton}><Text style={styles.finishButtonText}>Back to Today</Text></View>
          </ScalePress>
        </FadeInView>
      </View>
    );
  }

  if (dueGoals.length === 0) {
    return (
      <View style={styles.container}>
        <FadeInView delay={0} style={styles.finishWrap}>
          <Text style={styles.finishEmoji}>✦</Text>
          <Text style={styles.finishTitle}>All caught up</Text>
          <Text style={styles.finishSub}>No goals need check-in today. Nice work.</Text>
          <ScalePress onPress={() => router.back()}>
            <View style={styles.finishButton}><Text style={styles.finishButtonText}>Back to Today</Text></View>
          </ScalePress>
        </FadeInView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}><Text style={styles.iconBtnText}>✕</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Daily check-in</Text>
        <Text style={styles.counter}>{currentIndex + 1}/{dueGoals.length}</Text>
      </View>

      <View style={styles.progressBar}>
        {dueGoals.map((_, i) => (
          <View key={i} style={[styles.progressSegment, i < currentIndex && styles.progressDone, i === currentIndex && styles.progressCurrent]} />
        ))}
      </View>

      {currentGoal && (
        <View style={styles.cardWrap}>
          <View style={[styles.card, { borderColor: currentGoal.color || color.violet }]}>
            <LinearGradient colors={[(currentGoal.color || color.violet) + '10', color.surface2]} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
            <View style={styles.cardContent}>
              <View style={[styles.cardEmojiCircle, { backgroundColor: (currentGoal.color || color.violet) + '20' }]}>
                <Text style={styles.cardEmoji}>{currentGoal.emoji || '🎯'}</Text>
              </View>
              <Text style={styles.cardType}>
                {currentGoal.type} · {currentGoal.type === 'quit' ? `day ${Math.floor((Date.now() - new Date(currentGoal.startAt).getTime()) / 86400000)}` : currentGoal.category}
              </Text>
              <Text style={styles.cardQuestion}>
                {currentGoal.type === 'quit' ? `${currentGoal.title} today?` :
                 currentGoal.type === 'habit' ? `Did you ${currentGoal.title.toLowerCase()}?` :
                 `Progress on ${currentGoal.title}?`}
              </Text>
              {currentGoal.why && <Text style={styles.cardWhy}>{currentGoal.why}</Text>}
            </View>
          </View>

          <View style={styles.buttonRow}>
            <ScalePress onPress={() => handleAnswer('checkin')} style={{ flex: 2 }}>
              <View style={[styles.yesButton, { backgroundColor: currentGoal.color || color.violet }]}>
                <Text style={[styles.yesButtonText, { color: currentGoal.color === color.amber ? '#1A1405' : '#120D2B' }]}>
                  {currentGoal.type === 'quit' ? 'Yes, clean' : 'Done'}
                </Text>
              </View>
            </ScalePress>
            <ScalePress onPress={() => handleAnswer(currentGoal.type === 'quit' ? 'slip' : 'miss')}>
              <View style={styles.noButton}>
                <Text style={styles.noButtonText}>{currentGoal.type === 'quit' ? 'I slipped' : 'Not today'}</Text>
              </View>
            </ScalePress>
          </View>
        </View>
      )}

      <Text style={styles.footerText}>Only today can be logged.{'\n'}Honest answers keep your progress real.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 18, color: color.textMuted },
  headerTitle: { fontFamily: font.bodyBold, fontSize: fontSize.h3, color: color.text },
  counter: { fontFamily: font.bodySemiBold, fontSize: fontSize.label, color: color.textMuted },
  progressBar: { flexDirection: 'row', gap: 4, paddingHorizontal: spacing.xl, marginBottom: spacing.xl },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: color.track },
  progressDone: { backgroundColor: color.textMuted },
  progressCurrent: { backgroundColor: color.text },
  cardWrap: { paddingHorizontal: spacing.xl, flex: 1, justifyContent: 'center' },
  card: { borderRadius: radius.xl, overflow: 'hidden', borderWidth: 2, marginBottom: spacing.xl },
  cardContent: { padding: spacing.xxl, alignItems: 'center' },
  cardEmojiCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  cardEmoji: { fontSize: 32 },
  cardType: { fontFamily: font.bodySemiBold, fontSize: fontSize.eyebrow, color: color.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  cardQuestion: { fontFamily: font.displayBold, fontSize: 28, color: color.text, textAlign: 'center', marginBottom: spacing.md, lineHeight: 36 },
  cardWhy: { fontFamily: font.body, fontSize: fontSize.body, color: color.textSoft, textAlign: 'center', lineHeight: 22 },
  buttonRow: { flexDirection: 'row', gap: spacing.md },
  yesButton: { height: 56, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  yesButtonText: { fontFamily: font.bodyBold, fontSize: fontSize.h3 },
  noButton: { flex: 1, height: 56, borderRadius: radius.full, borderWidth: 1.5, borderColor: color.border, alignItems: 'center', justifyContent: 'center' },
  noButtonText: { fontFamily: font.bodyBold, fontSize: fontSize.body, color: color.textSoft },
  footerText: { fontFamily: font.body, fontSize: fontSize.caption, color: color.textMuted, textAlign: 'center', paddingBottom: spacing.xxl, lineHeight: 18 },
  finishWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  checkCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: color.teal, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  checkIcon: { fontSize: 40, color: '#071F1A' },
  finishEmoji: { fontSize: 56, color: color.textMuted, marginBottom: spacing.lg },
  finishTitle: { fontFamily: font.displayBold, fontSize: 32, color: color.text, marginBottom: spacing.sm },
  finishSub: { fontFamily: font.body, fontSize: fontSize.body, color: color.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  xpBadge: { backgroundColor: color.violet + '20', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.full, marginBottom: spacing.xxl },
  xpText: { fontFamily: font.bodyBold, fontSize: fontSize.body, color: accentText.violet },
  finishButton: { backgroundColor: color.violet, borderRadius: radius.full, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md + 2 },
  finishButtonText: { fontFamily: font.bodyBold, fontSize: fontSize.body, color: '#120D2B' },
});