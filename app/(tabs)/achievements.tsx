import React, { useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Dimensions, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useGoalStore } from '@/features/goals/store';
import { color, font, fontSize, spacing, radius, accentText } from '@/theme/tokens';
import { FadeInView } from '@/components/AnimatedNumber';
import { ProgressRing } from '@/components/ProgressRing';
import { getLevel, getXPToNextLevel, LEVEL_THRESHOLDS } from '@/features/motivation/xp';

const { width } = Dimensions.get('window');

const BADGES = [
  { id: 'b1', label: 'Day 1', emoji: '🌱', milestone: 1 },
  { id: 'b2', label: 'Day 3', emoji: '🌿', milestone: 3 },
  { id: 'b3', label: 'Day 7', emoji: '⭐', milestone: 7 },
  { id: 'b4', label: 'Day 14', emoji: '🔥', milestone: 14 },
  { id: 'b5', label: 'Day 30', emoji: '💎', milestone: 30 },
  { id: 'b6', label: 'Day 60', emoji: '🏆', milestone: 60 },
  { id: 'b7', label: 'Day 90', emoji: '👑', milestone: 90 },
  { id: 'b8', label: 'Day 180', emoji: '🌟', milestone: 180 },
  { id: 'b9', label: 'Day 365', emoji: '🎊', milestone: 365 },
];

export default function AchievementsScreen() {
  const db = useSQLiteContext();
  const { goals, entries, stats, loadAll } = useGoalStore();
  useFocusEffect(useCallback(() => { loadAll(db); }, [db]));
  const activeGoals = goals.filter(g => !g.archivedAt);

  const totalXP = useMemo(() => {
    let xp = 0;
    for (const g of activeGoals) {
      const es = entries[g.id] ?? [];
      xp += es.filter(e => e.kind === 'checkin').length * 20;
      xp += es.filter(e => e.kind === 'urge_resisted').length * 50;
      xp += es.filter(e => e.kind === 'focus_session').length * 25;
    }
    return xp;
  }, [activeGoals, entries]);

  const level = getLevel(totalXP);
  const xpToNext = getXPToNextLevel(totalXP);
  const levelProgress = level < LEVEL_THRESHOLDS.length
    ? (totalXP - LEVEL_THRESHOLDS[level - 1]) / (LEVEL_THRESHOLDS[level] - LEVEL_THRESHOLDS[level - 1])
    : 1;

  const maxStreak = Math.max(0, ...activeGoals.map(g => stats[g.id]?.currentStreak ?? 0));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeInView delay={0} direction="down">
          <Text style={styles.title}>Awards</Text>
          <Text style={styles.subtitle}>Milestones and badges</Text>
        </FadeInView>

        <FadeInView delay={100}>
          <View style={styles.levelCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xl, marginBottom: spacing.lg }}>
              <ProgressRing progress={levelProgress} size={80} strokeWidth={8} color={color.violet}>
                <Text style={styles.levelNumber}>{level}</Text>
                <Text style={styles.levelLabel}>Level</Text>
              </ProgressRing>
              <View style={{ flex: 1 }}>
                <Text style={styles.levelTitle}>Level {level}</Text>
                <Text style={styles.levelXP}>{totalXP.toLocaleString()} XP</Text>
                <Text style={styles.levelNext}>{xpToNext > 0 ? `${xpToNext} XP to level ${level + 1}` : 'Max level!'}</Text>
              </View>
            </View>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: `${Math.round(levelProgress * 100)}%`, backgroundColor: color.violet }]} />
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={200}>
          <View style={{ marginTop: spacing.xl }}>
            <Text style={styles.sectionTitle}>Badge wall</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
              {BADGES.map((badge, i) => {
                const unlocked = maxStreak >= badge.milestone;
                return (
                  <FadeInView key={badge.id} delay={250 + i * 50}>
                    <View style={[styles.badgeCard, !unlocked && { opacity: 0.4 }]}>
                      <Text style={{ fontSize: unlocked ? 32 : 28, marginBottom: spacing.sm }}>{unlocked ? badge.emoji : '🔒'}</Text>
                      <Text style={[styles.badgeLabel, !unlocked && { color: color.textMuted }]}>{badge.label}</Text>
                      {unlocked && <Text style={styles.badgeUnlocked}>Unlocked</Text>}
                    </View>
                  </FadeInView>
                );
              })}
            </View>
          </View>
        </FadeInView>

        <FadeInView delay={400}>
          <View style={{ marginTop: spacing.xl }}>
            <Text style={styles.sectionTitle}>Your stats</Text>
            <View style={styles.statsRow}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={styles.statValue}>{totalXP.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Total XP</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={[styles.statValue, { color: color.amber }]}>{maxStreak}</Text>
                <Text style={styles.statLabel}>Best streak</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={[styles.statValue, { color: color.teal }]}>{BADGES.filter(b => maxStreak >= b.milestone).length}</Text>
                <Text style={styles.statLabel}>Badges</Text>
              </View>
            </View>
          </View>
        </FadeInView>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.bg },
  scroll: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: spacing.xl },
  title: { fontFamily: font.displayBold, fontSize: 36, color: color.text },
  subtitle: { fontFamily: font.body, fontSize: fontSize.body, color: color.textMuted, marginTop: spacing.xs },
  levelCard: {
    backgroundColor: color.surface, borderRadius: radius.xl,
    padding: spacing.xl, marginTop: spacing.xl, borderWidth: 1, borderColor: color.track,
  },
  levelNumber: { fontFamily: font.displayBold, fontSize: 28, color: color.violet },
  levelLabel: { fontFamily: font.body, fontSize: 10, color: color.textMuted },
  levelTitle: { fontFamily: font.bodyBold, fontSize: fontSize.h2, color: color.text },
  levelXP: { fontFamily: font.body, fontSize: fontSize.body, color: color.textSoft, marginTop: 2 },
  levelNext: { fontFamily: font.body, fontSize: fontSize.caption, color: color.textMuted, marginTop: 2 },
  xpTrack: { height: 6, backgroundColor: color.track, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 3 },
  sectionTitle: { fontFamily: font.bodyBold, fontSize: fontSize.h2, color: color.text, marginBottom: spacing.md },
  badgeCard: {
    width: (width - spacing.xl * 2 - spacing.md * 2) / 3,
    backgroundColor: color.surface, borderRadius: radius.lg,
    padding: spacing.md, alignItems: 'center',
  },
  badgeLabel: { fontFamily: font.bodySemiBold, fontSize: fontSize.caption, color: color.text, textAlign: 'center' },
  badgeUnlocked: { fontFamily: font.body, fontSize: 9, color: color.teal, marginTop: 2 },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: color.surface, borderRadius: radius.lg, padding: spacing.lg,
  },
  statValue: { fontFamily: font.displayBold, fontSize: 24, color: color.text },
  statLabel: { fontFamily: font.body, fontSize: fontSize.caption, color: color.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: color.track },
});