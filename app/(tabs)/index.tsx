import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Dimensions, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useGoalStore } from '@/features/goals/store';
import { getNextStreakMilestone, getProgressToNextMilestone } from '@/features/motivation/milestones';
import { formatElapsed, isToday } from '@/lib/dates';
import { color, font, fontSize, spacing, radius, accentText, onAccent } from '@/theme/tokens';
import { ProgressRing, MiniRing } from '@/components/ProgressRing';
import { AnimatedNumber, FadeInView, ScalePress } from '@/components/AnimatedNumber';
import type { Goal, DerivedGoalStats } from '@/db/types';

const { width } = Dimensions.get('window');

export default function TodayScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { goals, entries, stats, loadAll } = useGoalStore();
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      loadAll(db);
    }, [db])
  );

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll(db);
    setRefreshing(false);
  };

  const activeGoals = goals.filter(g => !g.archivedAt);

  const doneToday = useMemo(() =>
    activeGoals.filter(g => {
      const es = entries[g.id] ?? [];
      return es.some(e => isToday(e.at) && e.kind !== 'miss' && e.kind !== 'slip');
    }).length,
  [activeGoals, entries]);

  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.textMuted} />
        }
      >
        {/* Header */}
        <FadeInView delay={0} direction="down">
          <View style={styles.header}>
            <Text style={styles.dateText}>{dateStr}</Text>
            <Text style={styles.title}>Today</Text>
          </View>
          <View style={styles.headerActions}>
            <ScalePress
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/checkin');
              }}
              style={styles.checkinWrap}
            >
              <View style={styles.checkinPill}>
                <View style={styles.checkinDot} />
                <Text style={styles.checkinPillText}>Check in</Text>
              </View>
            </ScalePress>
            <ScalePress
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/goal/new');
              }}
            >
              <View style={styles.addButton}>
                <Text style={styles.addButtonText}>+</Text>
              </View>
            </ScalePress>
          </View>
        </FadeInView>

        {/* Summary ring strip */}
        <FadeInView delay={100}>
          <View style={styles.summaryStrip}>
            <ProgressRing
              progress={activeGoals.length > 0 ? doneToday / activeGoals.length : 0}
              size={56}
              strokeWidth={5}
              color={color.teal}
              delay={200}
            >
              <Text style={styles.summaryRingText}>
                {doneToday}/{activeGoals.length}
              </Text>
            </ProgressRing>
            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryTitle}>
                {doneToday === activeGoals.length && activeGoals.length > 0
                  ? 'All done today! ✦'
                  : `${activeGoals.length - doneToday} to go today`}
              </Text>
              <Text style={styles.summarySub}>Keep the momentum going</Text>
            </View>
          </View>
        </FadeInView>

        {/* Hero goal card */}
        {activeGoals.length > 0 && (
          <FadeInView delay={200}>
            <HeroGoalCard
              goal={activeGoals[0]}
              stats={stats[activeGoals[0].id]}
              now={now}
            />
          </FadeInView>
        )}

        {/* Goal list */}
        <FadeInView delay={300}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your goals</Text>
            <Text style={styles.sectionCount}>{activeGoals.length} active</Text>
          </View>
        </FadeInView>

        {activeGoals.length === 0 ? (
          <FadeInView delay={400}>
            <EmptyState onCreate={() => router.push('/goal/new')} />
          </FadeInView>
        ) : (
          activeGoals.slice(1).map((goal, i) => (
            <FadeInView key={goal.id} delay={350 + i * 80}>
              <GoalRow goal={goal} stats={stats[goal.id]} />
            </FadeInView>
          ))
        )}

        {activeGoals.length === 1 && (
          <FadeInView delay={350}>
            <GoalRow goal={activeGoals[0]} stats={stats[activeGoals[0].id]} />
          </FadeInView>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function HeroGoalCard({ goal, stats, now }: { goal: Goal; stats?: DerivedGoalStats; now: Date }) {
  const router = useRouter();
  const streak = stats?.currentStreak ?? 0;
  const nextMilestone = getNextStreakMilestone(streak);
  const progressToNext = getProgressToNextMilestone(streak);
  const accentColor = goal.color || color.violet;
  const elapsed = formatElapsed(goal.startAt, now);

  return (
    <ScalePress onPress={() => router.push(`/goal/${goal.id}`)} style={styles.heroWrap}>
      <View style={[styles.heroCard, { borderColor: accentColor + '30' }]}>
        <LinearGradient
          colors={[accentColor + '15', color.surface]}
          style={styles.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.heroContent}>
          <View style={styles.heroTop}>
            <View style={[styles.heroEmojiCircle, { backgroundColor: accentColor + '20' }]}>
              <Text style={styles.heroEmoji}>{goal.emoji || '🎯'}</Text>
            </View>
            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroTitle} numberOfLines={1}>{goal.title}</Text>
              {nextMilestone && (
                <Text style={styles.heroSub}>Next badge · day {nextMilestone}</Text>
              )}
            </View>
            <View style={[styles.heroBadge, { backgroundColor: accentColor + '20' }]}>
              <Text style={[styles.heroBadgeText, { color: accentColor }]}>{goal.type}</Text>
            </View>
          </View>

          {/* Ring + number */}
          <View style={styles.heroRingSection}>
            <ProgressRing
              progress={goal.type === 'quit' || goal.type === 'streak' ? progressToNext : (stats?.progressPct ?? 0)}
              size={120}
              strokeWidth={12}
              color={accentColor}
              delay={300}
            >
              <AnimatedNumber
                value={goal.type === 'quit' ? elapsed.days : streak}
                style={styles.heroRingNumber}
                delay={400}
              />
              <Text style={styles.heroRingLabel}>
                {goal.type === 'quit' || goal.type === 'streak' ? 'days' : goal.unit ?? 'done'}
              </Text>
            </ProgressRing>
            {goal.type === 'quit' && (
              <View style={styles.elapsedWrap}>
                <Text style={styles.elapsedTime}>{elapsed.hours}h {elapsed.minutes}m</Text>
                <Text style={styles.elapsedLabel}>clean</Text>
              </View>
            )}
          </View>

          {/* Stats trio */}
          <View style={styles.heroStats}>
            <HeroStat label="Best" value={stats?.bestStreak ?? 0} color={accentColor} />
            <View style={styles.statDivider} />
            <HeroStat label="Strength" value={stats?.strengthScore ?? 0} color={color.teal} />
            <View style={styles.statDivider} />
            {stats?.moneySaved ? (
              <HeroStat label="Saved" value={Math.floor(stats.moneySaved)} color={color.emerald} prefix="$" />
            ) : (
              <HeroStat label="Clean days" value={stats?.totalCleanDays ?? 0} color={accentColor} />
            )}
          </View>
        </View>
      </View>
    </ScalePress>
  );
}

function HeroStat({ label, value, color: c, prefix = '' }: { label: string; value: number; color: string; prefix?: string }) {
  return (
    <View style={styles.heroStatBox}>
      <Text style={[styles.heroStatValue, { color: c }]}>{prefix}{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function GoalRow({ goal, stats }: { goal: Goal; stats?: DerivedGoalStats }) {
  const router = useRouter();
  const accentColor = goal.color || color.violet;
  const streak = stats?.currentStreak ?? 0;
  const pct = stats?.progressPct ?? 0;

  return (
    <ScalePress onPress={() => router.push(`/goal/${goal.id}`)} style={styles.rowWrap}>
      <View style={styles.goalRow}>
        <MiniRing progress={pct} size={40} color={accentColor} />
        <View style={styles.goalRowText}>
          <Text style={styles.goalRowTitle} numberOfLines={1}>{goal.title}</Text>
          <View style={styles.goalRowStatusRow}>
            {stats?.paceStatus === 'ahead' ? (
              <Text style={[styles.goalRowStatus, { color: color.teal }]}>Ahead of pace 🔥</Text>
            ) : stats?.paceStatus === 'behind' ? (
              <Text style={[styles.goalRowStatus, { color: color.amber }]}>Behind</Text>
            ) : (
              <Text style={styles.goalRowStatus}>
                {goal.type === 'quit' || goal.type === 'streak'
                  ? `${streak} day streak`
                  : goal.type === 'target'
                  ? `${Math.floor(pct * (goal.targetValue ?? 100))} / ${goal.targetValue} ${goal.unit ?? ''}`
                  : `${streak} this ${goal.period ?? 'week'}`}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.goalRowValue, { backgroundColor: accentColor + '15' }]}>
          <Text style={[styles.goalRowNumber, { color: accentColor }]}>
            {goal.type === 'quit' || goal.type === 'streak' ? streak :
             goal.type === 'target' ? `${Math.floor(pct * 100)}%` :
             `${streak}/${goal.targetValue ?? '?'}`}
          </Text>
        </View>
      </View>
    </ScalePress>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.empty}>
      <ProgressRing progress={0} size={100} strokeWidth={8} color={color.violet}>
        <Text style={styles.emptyIcon}>✦</Text>
      </ProgressRing>
      <Text style={styles.emptyTitle}>Your journey starts here</Text>
      <Text style={styles.emptyText}>
        Create your first goal and start building momentum.{'\n'}Every day counts.
      </Text>
      <ScalePress onPress={onCreate}>
        <View style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>Create your first goal</Text>
        </View>
      </ScalePress>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.bg },
  scroll: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: spacing.xl },
  header: { marginBottom: spacing.md },
  dateText: {
    fontFamily: font.body,
    fontSize: fontSize.caption,
    color: color.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontFamily: font.displayBold,
    fontSize: 36,
    color: color.text,
    marginTop: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  checkinWrap: { flex: 1 },
  checkinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: color.surface2,
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    borderWidth: 1.5,
    borderColor: color.border,
  },
  checkinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.teal,
  },
  checkinPillText: {
    fontFamily: font.bodySemiBold,
    fontSize: fontSize.body,
    color: color.text,
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: color.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { fontSize: 26, color: '#120D2B', marginTop: -2, fontWeight: '700' as const },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: color.track,
  },
  summaryRingText: {
    fontFamily: font.displayBold,
    fontSize: 14,
    color: color.text,
  },
  summaryTextWrap: { flex: 1 },
  summaryTitle: {
    fontFamily: font.bodyBold,
    fontSize: fontSize.h3,
    color: color.text,
  },
  summarySub: {
    fontFamily: font.body,
    fontSize: fontSize.caption,
    color: color.textMuted,
    marginTop: 2,
  },
  heroWrap: { marginBottom: spacing.xl },
  heroCard: {
    borderRadius: radius.xl,
    overflow: 'hidden' as const,
    borderWidth: 1,
  },
  heroGradient: {
    ...StyleSheet.absoluteFill,
  },
  heroContent: {
    padding: spacing.xl,
  },
  heroTop: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  heroEmojiCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  heroEmoji: { fontSize: 24 },
  heroTitleWrap: { flex: 1 },
  heroTitle: { fontFamily: font.bodyBold, fontSize: fontSize.h3, color: color.text },
  heroSub: { fontFamily: font.body, fontSize: fontSize.caption, color: color.textMuted, marginTop: 2 },
  heroBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  heroBadgeText: {
    fontFamily: font.bodySemiBold,
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  heroRingSection: {
    alignItems: 'center' as const,
    marginBottom: spacing.xl,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: spacing.xxl,
  },
  heroRingNumber: {
    fontFamily: font.displayBold,
    fontSize: 36,
    color: color.text,
  },
  heroRingLabel: {
    fontFamily: font.body,
    fontSize: fontSize.caption,
    color: color.textMuted,
  },
  elapsedWrap: { alignItems: 'center' as const },
  elapsedTime: {
    fontFamily: font.displayBold,
    fontSize: fontSize.h2,
    color: color.text,
  },
  elapsedLabel: {
    fontFamily: font.body,
    fontSize: fontSize.caption,
    color: color.textMuted,
  },
  heroStats: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    alignItems: 'center' as const,
    backgroundColor: color.bg + '80',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  heroStatBox: { alignItems: 'center' as const, flex: 1 },
  heroStatValue: { fontFamily: font.displayBold, fontSize: 22 },
  heroStatLabel: { fontFamily: font.body, fontSize: 11, color: color.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: color.track },
  sectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: font.bodyBold,
    fontSize: fontSize.h2,
    color: color.text,
  },
  sectionCount: {
    fontFamily: font.body,
    fontSize: fontSize.caption,
    color: color.textMuted,
  },
  rowWrap: { marginBottom: spacing.sm + 2 },
  goalRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  goalRowText: { flex: 1 },
  goalRowTitle: { fontFamily: font.bodySemiBold, fontSize: fontSize.body, color: color.text },
  goalRowStatusRow: { marginTop: 2 },
  goalRowStatus: { fontFamily: font.body, fontSize: fontSize.caption, color: color.textMuted },
  goalRowValue: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    minWidth: 56,
    alignItems: 'center' as const,
  },
  goalRowNumber: { fontFamily: font.displayBold, fontSize: fontSize.h3 },
  empty: {
    alignItems: 'center' as const,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: { fontSize: 32, color: color.violet },
  emptyTitle: {
    fontFamily: font.displayBold,
    fontSize: fontSize.h1,
    color: color.text,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontFamily: font.body,
    fontSize: fontSize.body,
    color: color.textMuted,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  emptyButton: {
    backgroundColor: color.violet,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md + 2,
  },
  emptyButtonText: {
    fontFamily: font.bodyBold,
    fontSize: fontSize.body,
    color: '#120D2B',
  },
});