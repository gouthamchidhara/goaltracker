import React, { useCallback, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Dimensions, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useGoalStore } from '@/features/goals/store';
import { formatElapsed, daysSince, isToday } from '@/lib/dates';
import { getNextStreakMilestone } from '@/features/motivation/milestones';
import { color, font, fontSize, spacing, radius, accentText } from '@/theme/tokens';
import { ProgressRing } from '@/components/ProgressRing';
import { AnimatedNumber, FadeInView, ScalePress } from '@/components/AnimatedNumber';
import { ContributionGrid, ContributionLegend } from '@/components/ContributionGrid';
import type { Goal, Entry, DerivedGoalStats } from '@/db/types';
import { v4 as uuid } from 'uuid';

export default function GoalDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  const { goals, entries, stats, loadAll, addEntry } = useGoalStore();
  const [now, setNow] = useState(new Date());

  useFocusEffect(useCallback(() => { loadAll(db); }, [db]));
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const goal = goals.find(g => g.id === id);
  if (!goal) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Goal not found</Text>
      </View>
    );
  }

  const goalEntries = entries[goal.id] ?? [];
  const goalStats = stats[goal.id];
  const accentColor = goal.color || color.violet;
  const elapsed = formatElapsed(goal.startAt, now);
  const isQuit = goal.type === 'quit';
  const isRecovery = goal.category === 'recovery';
  const nextMilestone = getNextStreakMilestone(goalStats?.currentStreak ?? 0);

  const handleCheckIn = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addEntry(db, { id: uuid(), goalId: goal.id, kind: 'checkin', at: new Date().toISOString() });
  };

  const handleSlip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert('Log a slip', 'One day doesn\'t erase your progress. Everything you built stays on the record.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log slip', onPress: async () => {
        await addEntry(db, { id: uuid(), goalId: goal.id, kind: 'slip', at: new Date().toISOString() });
        router.push(`/comeback/${goal.id}`);
      }},
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{goal.title}</Text>
          <TouchableOpacity style={styles.iconBtn}><Text style={styles.iconBtnText}>⋯</Text></TouchableOpacity>
        </View>

        {/* Why card */}
        {goal.why && (
          <FadeInView delay={100}>
            <View style={[styles.whyCard, { borderColor: accentColor + '20' }]}>
              <LinearGradient colors={[accentColor + '10', color.surface]} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
              <View style={{ padding: spacing.lg }}>
                <Text style={styles.whyLabel}>Why</Text>
                <Text style={styles.whyText}>{goal.why}</Text>
              </View>
            </View>
          </FadeInView>
        )}

        {/* Giant counter ring */}
        <FadeInView delay={200}>
          <View style={styles.counterSection}>
            <ProgressRing progress={goalStats?.progressPct ?? 0} size={180} strokeWidth={16} color={accentColor} delay={300}>
              <AnimatedNumber value={isQuit ? elapsed.days : (goalStats?.currentStreak ?? 0)} style={styles.counterBig} delay={500} />
              <Text style={styles.counterUnit}>
                {isQuit ? `days ${elapsed.hours}h ${elapsed.minutes}m` :
                 goal.type === 'streak' ? 'day streak' :
                 goal.type === 'target' ? goal.unit ?? 'done' :
                 `this ${goal.period ?? 'week'}`}
              </Text>
            </ProgressRing>
            {nextMilestone && <Text style={styles.nextBadge}>Next badge · day {nextMilestone}</Text>}
          </View>
        </FadeInView>

        {/* Stats trio */}
        <FadeInView delay={300}>
          <View style={styles.statsRow}>
            <StatBox label="Best" value={String(goalStats?.bestStreak ?? 0)} color={accentColor} />
            <View style={styles.statDivider} />
            <StatBox label="Total clean" value={String(goalStats?.totalCleanDays ?? 0)} color={color.text} />
            <View style={styles.statDivider} />
            <StatBox label="Strength" value={String(goalStats?.strengthScore ?? 0)} color={color.teal} />
          </View>
        </FadeInView>

        {/* Savings */}
        {isQuit && goalStats?.moneySaved ? (
          <FadeInView delay={350}>
            <View style={styles.savingsCard}>
              <LinearGradient colors={[color.emerald + '15', color.surface]} style={StyleSheet.absoluteFill} start={{x:0,y:0}} end={{x:1,y:1}} />
              <View style={styles.savingsContent}>
                <View style={styles.savingsItem}>
                  <Text style={styles.savingsAmount}>${Math.floor(goalStats.moneySaved)}</Text>
                  <Text style={styles.savingsLabel}>saved</Text>
                </View>
                {goalStats.timeSavedMinutes > 0 && (<>
                  <View style={styles.statDivider} />
                  <View style={styles.savingsItem}>
                    <Text style={styles.savingsAmount}>{Math.floor(goalStats.timeSavedMinutes / 60)}h</Text>
                    <Text style={styles.savingsLabel}>reclaimed</Text>
                  </View>
                </>)}
              </View>
            </View>
          </FadeInView>
        ) : null}

        {/* Progress for deadline goals */}
        {goalStats?.daysLeft != null && (
          <FadeInView delay={400}>
            <View style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                <Text style={styles.deadlineText}>{goalStats.daysLeft} days left</Text>
                <Text style={[styles.paceText, { color: goalStats.paceStatus === 'ahead' ? color.teal : goalStats.paceStatus === 'behind' ? color.amber : color.textMuted }]}>
                  {goalStats.paceStatus === 'ahead' ? 'Ahead of pace 🔥' : goalStats.paceStatus === 'behind' ? 'Behind' : 'On track'}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round((goalStats.progressPct ?? 0) * 100)}%`, backgroundColor: accentColor }]} />
              </View>
            </View>
          </FadeInView>
        )}

        {/* Actions */}
        <FadeInView delay={450}>
          <View style={styles.actions}>
            <ScalePress onPress={handleCheckIn}>
              <View style={[styles.primaryAction, { backgroundColor: accentColor }]}>
                <Text style={[styles.primaryActionText, { color: goal.color === color.amber ? '#1A1405' : '#120D2B' }]}>
                  {goal.type === 'quit' ? 'Pledge today' : goal.type === 'habit' ? 'Check in' : 'Log progress'}
                </Text>
              </View>
            </ScalePress>
            {isRecovery ? (
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <ScalePress onPress={handleSlip}>
                  <View style={styles.secondaryAction}><Text style={styles.secondaryActionText}>Log a slip</Text></View>
                </ScalePress>
                <ScalePress onPress={() => router.push(`/urge/${goal.id}`)}>
                  <View style={[styles.secondaryAction, { borderColor: color.calm }]}>
                    <Text style={[styles.secondaryActionText, { color: accentText.calm }]}>I feel an urge</Text>
                  </View>
                </ScalePress>
              </View>
            ) : (
              <ScalePress onPress={() => router.push(`/focus/${goal.id}`)}>
                <View style={styles.secondaryAction}><Text style={styles.secondaryActionText}>Start focus session</Text></View>
              </ScalePress>
            )}
          </View>
        </FadeInView>

        {/* Contribution grid */}
        <FadeInView delay={500}>
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={styles.sectionTitle}>Activity</Text>
            <ContributionGrid data={buildGridData(goal, goalEntries, 84)} goalColor={accentColor} weeks={12} />
            <ContributionLegend goalColor={accentColor} />
          </View>
        </FadeInView>

        {/* Entries */}
        <FadeInView delay={550}>
          <View style={{ marginBottom: spacing.xxl }}>
            <Text style={styles.sectionTitle}>Recent entries</Text>
            {goalEntries.length === 0 ? (
              <Text style={styles.emptyEntries}>No entries yet. Your first check-in starts the streak.</Text>
            ) : (
              goalEntries.slice(-8).reverse().map(e => (
                <View key={e.id} style={styles.entryRow}>
                  <View style={[styles.entryDot, { backgroundColor: e.kind === 'slip' ? color.slip : e.kind === 'miss' ? color.missed : accentColor }]} />
                  <Text style={styles.entryKind}>{e.kind}</Text>
                  <Text style={styles.entryDate}>{new Date(e.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                </View>
              ))
            )}
          </View>
        </FadeInView>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function StatBox({ label, value, color: c }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[styles.statValue, { color: c }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function buildGridData(goal: Goal, entries: Entry[], totalDays: number): string {
  const today = new Date();
  const start = new Date(goal.startAt);
  const chars: string[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (totalDays - 1 - i));
    const key = d.toISOString().slice(0, 10);
    if (d < start) { chars.push('0'); continue; }
    const dayEntries = entries.filter(e => e.at.slice(0, 10) === key);
    if (dayEntries.some(e => e.kind === 'slip')) chars.push('2');
    else if (dayEntries.some(e => e.kind === 'checkin' || e.kind === 'increment' || e.kind === 'urge_resisted')) chars.push('1');
    else if (dayEntries.some(e => e.kind === 'miss')) chars.push('3');
    else chars.push('0');
  }
  return chars.join('');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.bg },
  scroll: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: spacing.xl },
  notFound: { color: color.text, fontFamily: font.body, fontSize: fontSize.body, padding: spacing.xl, marginTop: 100, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 22, color: color.text },
  headerTitle: { fontFamily: font.bodyBold, fontSize: fontSize.h3, color: color.text, flex: 1, textAlign: 'center' },
  whyCard: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg, borderWidth: 1 },
  whyLabel: { fontFamily: font.bodySemiBold, fontSize: fontSize.eyebrow, color: color.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.xs },
  whyText: { fontFamily: font.body, fontSize: fontSize.body, color: color.textSoft, lineHeight: 22 },
  counterSection: { alignItems: 'center', paddingVertical: spacing.xl, marginBottom: spacing.lg },
  counterBig: { fontFamily: font.displayBold, fontSize: 52, color: color.text },
  counterUnit: { fontFamily: font.body, fontSize: fontSize.caption, color: color.textMuted, marginTop: 2 },
  nextBadge: { fontFamily: font.body, fontSize: fontSize.caption, color: color.textMuted, marginTop: spacing.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: color.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  statValue: { fontFamily: font.displayBold, fontSize: 24 },
  statLabel: { fontFamily: font.body, fontSize: fontSize.caption, color: color.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: color.track },
  savingsCard: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg },
  savingsContent: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.xxl },
  savingsItem: { alignItems: 'center' },
  savingsAmount: { fontFamily: font.displayBold, fontSize: 32, color: color.emerald },
  savingsLabel: { fontFamily: font.body, fontSize: fontSize.caption, color: color.textMuted },
  deadlineText: { fontFamily: font.bodyBold, fontSize: fontSize.body, color: color.text },
  paceText: { fontFamily: font.bodySemiBold, fontSize: fontSize.label },
  progressTrack: { height: 8, backgroundColor: color.track, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  actions: { gap: spacing.md, marginBottom: spacing.xl },
  primaryAction: { height: 56, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  primaryActionText: { fontFamily: font.bodyBold, fontSize: fontSize.h3 },
  secondaryAction: { flex: 1, height: 52, borderRadius: radius.full, borderWidth: 1.5, borderColor: color.border, alignItems: 'center', justifyContent: 'center' },
  secondaryActionText: { fontFamily: font.bodyBold, fontSize: fontSize.body, color: color.textSoft },
  sectionTitle: { fontFamily: font.bodyBold, fontSize: fontSize.h2, color: color.text, marginBottom: spacing.md },
  emptyEntries: { fontFamily: font.body, fontSize: fontSize.body, color: color.textMuted, lineHeight: 22 },
  entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: color.track, gap: spacing.md },
  entryDot: { width: 8, height: 8, borderRadius: 4 },
  entryKind: { fontFamily: font.bodySemiBold, fontSize: fontSize.label, color: color.textSoft, flex: 1 },
  entryDate: { fontFamily: font.body, fontSize: fontSize.label, color: color.textMuted },
});