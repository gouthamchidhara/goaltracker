import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Dimensions, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useGoalStore } from '@/features/goals/store';
import { color, font, fontSize, spacing, radius } from '@/theme/tokens';
import { ProgressRing, MiniRing } from '@/components/ProgressRing';
import { FadeInView } from '@/components/AnimatedNumber';
import { ContributionGrid, ContributionLegend } from '@/components/ContributionGrid';
import type { Goal, Entry } from '@/db/types';

const { width } = Dimensions.get('window');

export default function InsightsScreen() {
  const db = useSQLiteContext();
  const { goals, entries, stats, loadAll } = useGoalStore();
  useFocusEffect(useCallback(() => { loadAll(db); }, [db]));
  const activeGoals = goals.filter(g => !g.archivedAt);

  const consistency = useMemo(() => {
    const today = new Date();
    let doneDays = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (activeGoals.some(g => (entries[g.id] ?? []).some(e =>
        e.at.slice(0, 10) === key && (e.kind === 'checkin' || e.kind === 'increment' || e.kind === 'urge_resisted')
      ))) doneDays++;
    }
    return Math.round((doneDays / 30) * 100);
  }, [activeGoals, entries]);

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

  const bestStreak = useMemo(() =>
    Math.max(0, ...activeGoals.map(g => stats[g.id]?.bestStreak ?? 0)),
  [activeGoals, stats]);

  const mostConsistent = useMemo(() => {
    if (activeGoals.length === 0) return null;
    return activeGoals.reduce((best, g) =>
      (stats[g.id]?.strengthScore ?? 0) > (stats[best.id]?.strengthScore ?? 0) ? g : best
    );
  }, [activeGoals, stats]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeInView delay={0} direction="down">
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>Your patterns and progress</Text>
        </FadeInView>

        <FadeInView delay={100}>
          <View style={styles.metricsGrid}>
            <MetricCard label="Consistency" value={`${consistency}%`} sub="Last 30 days" color={color.teal} progress={consistency / 100} />
            <MetricCard label="Total XP" value={totalXP.toLocaleString()} sub="All time" color={color.violet} />
            <MetricCard label="Best streak" value={`${bestStreak}`} sub="Across all goals" color={color.amber} />
            <MetricCard label="Active goals" value={`${activeGoals.length}`} sub="Currently tracking" color={color.blue} />
          </View>
        </FadeInView>

        {mostConsistent && (
          <FadeInView delay={200}>
            <View style={{ marginTop: spacing.xl }}>
              <Text style={styles.sectionTitle}>Most consistent</Text>
              <View style={styles.topGoalCard}>
                <MiniRing progress={(stats[mostConsistent.id]?.strengthScore ?? 0) / 100} size={56} color={mostConsistent.color || color.violet} strokeWidth={5} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.topGoalTitle}>{mostConsistent.title}</Text>
                  <Text style={styles.topGoalSub}>
                    Strength {stats[mostConsistent.id]?.strengthScore ?? 0} · {stats[mostConsistent.id]?.currentStreak ?? 0} day streak
                  </Text>
                </View>
              </View>
            </View>
          </FadeInView>
        )}

        <FadeInView delay={300}>
          <View style={{ marginTop: spacing.xl }}>
            <Text style={styles.sectionTitle}>12-week activity</Text>
            {activeGoals.length > 0 && (<>
              <ContributionGrid data={buildCombinedGrid(activeGoals, entries, 84)} goalColor={color.teal} weeks={12} />
              <ContributionLegend goalColor={color.teal} />
            </>)}
          </View>
        </FadeInView>

        <FadeInView delay={400}>
          <View style={{ marginTop: spacing.xl }}>
            <Text style={styles.sectionTitle}>Goal breakdown</Text>
            {activeGoals.map(g => {
              const s = stats[g.id]?.strengthScore ?? 0;
              return (
                <View key={g.id} style={styles.goalRow}>
                  <MiniRing progress={stats[g.id]?.progressPct ?? 0} size={36} color={g.color || color.violet} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalTitle}>{g.title}</Text>
                    <Text style={styles.goalSub}>Strength {s} · {stats[g.id]?.currentStreak ?? 0} days</Text>
                  </View>
                  <View style={[styles.strengthBadge, { backgroundColor: (s >= 70 ? color.teal : s >= 40 ? color.amber : color.missed) + '20' }]}>
                    <Text style={[styles.strengthText, { color: s >= 70 ? color.teal : s >= 40 ? color.amber : color.missed }]}>{s}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </FadeInView>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function MetricCard({ label, value, sub, color: c, progress }: { label: string; value: string; sub: string; color: string; progress?: number }) {
  return (
    <View style={styles.metricCard}>
      {progress !== undefined ? (
        <ProgressRing progress={progress} size={64} strokeWidth={5} color={c}>
          <Text style={[styles.metricValue, { color: c }]}>{value}</Text>
        </ProgressRing>
      ) : (
        <Text style={[styles.metricValue, { color: c }]}>{value}</Text>
      )}
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricSub}>{sub}</Text>
    </View>
  );
}

function buildCombinedGrid(goals: Goal[], entries: Record<string, Entry[]>, totalDays: number): string {
  const today = new Date();
  const chars: string[] = [];
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (totalDays - 1 - i));
    const key = d.toISOString().slice(0, 10);
    const dayEntries = goals.flatMap(g => (entries[g.id] ?? []).filter(e => e.at.slice(0, 10) === key));
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
  title: { fontFamily: font.displayBold, fontSize: 36, color: color.text },
  subtitle: { fontFamily: font.body, fontSize: fontSize.body, color: color.textMuted, marginTop: spacing.xs },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl },
  metricCard: {
    width: (width - spacing.xl * 2 - spacing.md) / 2,
    backgroundColor: color.surface, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: 'center',
  },
  metricValue: { fontFamily: font.displayBold, fontSize: 24 },
  metricLabel: { fontFamily: font.bodySemiBold, fontSize: fontSize.label, color: color.text, marginTop: spacing.xs },
  metricSub: { fontFamily: font.body, fontSize: 11, color: color.textMuted, marginTop: 2 },
  sectionTitle: { fontFamily: font.bodyBold, fontSize: fontSize.h2, color: color.text, marginBottom: spacing.md },
  topGoalCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: color.surface, borderRadius: radius.lg,
    padding: spacing.lg, gap: spacing.lg,
  },
  topGoalTitle: { fontFamily: font.bodyBold, fontSize: fontSize.h3, color: color.text },
  topGoalSub: { fontFamily: font.body, fontSize: fontSize.label, color: color.textMuted, marginTop: 2 },
  goalRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: color.surface, borderRadius: radius.lg,
    padding: spacing.md + 2, marginBottom: spacing.sm + 2, gap: spacing.md,
  },
  goalTitle: { fontFamily: font.bodySemiBold, fontSize: fontSize.body, color: color.text },
  goalSub: { fontFamily: font.body, fontSize: fontSize.caption, color: color.textMuted, marginTop: 2 },
  strengthBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, minWidth: 44, alignItems: 'center' },
  strengthText: { fontFamily: font.displayBold, fontSize: fontSize.h3 },
});