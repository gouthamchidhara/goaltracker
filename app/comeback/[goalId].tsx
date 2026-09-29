import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useGoalStore } from '@/features/goals/store';
import { color, font, fontSize, spacing, radius, accentText } from '@/theme/tokens';
import { FadeInView, ScalePress } from '@/components/AnimatedNumber';
import { ProgressRing } from '@/components/ProgressRing';

const TRIGGERS = ['Stress', 'Friends smoking', 'After a drink', 'Boredom', 'Coffee', 'Bad sleep', 'Social events'];

export default function ComebackScreen() {
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const db = useSQLiteContext();
  const { goals, stats, loadAll } = useGoalStore();
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);

  useFocusEffect(useCallback(() => { loadAll(db); }, [db]));

  const goal = goals.find(g => g.id === goalId);
  const goalStats = stats[goalId!];

  const toggleTrigger = (t: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTriggers(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comeback</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Main message */}
        <FadeInView delay={0}>
          <View style={styles.messageSection}>
            <Text style={styles.eyebrow}>Slip logged · honest counts</Text>
            <Text style={styles.headline}>
              One day doesn't erase {goalStats?.bestStreak ?? goalStats?.totalCleanDays ?? 47}.
            </Text>
            <Text style={styles.subtext}>
              Your streak restarts, but everything you built stays on the record.
            </Text>
          </View>
        </FadeInView>

        {/* 2x2 stat grid */}
        <FadeInView delay={200}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: color.teal }]}>{goalStats?.totalCleanDays ?? 0}</Text>
              <Text style={styles.statLabel}>Total clean days</Text>
              <Text style={styles.statNote}>kept</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: color.amber }]}>{goalStats?.bestStreak ?? 0}</Text>
              <Text style={styles.statLabel}>Best streak</Text>
              <Text style={styles.statNote}>to beat</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: color.emerald }]}>
                ${Math.floor(goalStats?.moneySaved ?? 0)}
              </Text>
              <Text style={styles.statLabel}>Money saved</Text>
              <Text style={styles.statNote}>kept</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, { color: color.textSoft }]}>{goalStats?.strengthScore ?? 0}</Text>
              <Text style={styles.statLabel}>Strength</Text>
              <Text style={styles.statNote}>new value</Text>
            </View>
          </View>
        </FadeInView>

        {/* Trigger chips */}
        <FadeInView delay={300}>
          <View style={styles.triggerSection}>
            <Text style={styles.sectionTitle}>What set it off? (Optional)</Text>
            <View style={styles.chipsRow}>
              {TRIGGERS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, selectedTriggers.includes(t) && styles.chipActive]}
                  onPress={() => toggleTrigger(t)}
                >
                  <Text style={[styles.chipText, selectedTriggers.includes(t) && styles.chipTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </FadeInView>

        {/* Why card */}
        {goal?.why && (
          <FadeInView delay={400}>
            <View style={styles.whyCard}>
              <LinearGradient
                colors={[color.amber + '10', color.surface]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <View style={styles.whyContent}>
                <Text style={styles.whyLabel}>Still your why</Text>
                <Text style={styles.whyText}>{goal.why}</Text>
              </View>
            </View>
          </FadeInView>
        )}

        {/* Actions */}
        <FadeInView delay={500}>
          <View style={styles.actions}>
            <ScalePress onPress={() => router.back()}>
              <View style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Start day 1 now</Text>
              </View>
            </ScalePress>
            <ScalePress onPress={() => router.push(`/urge/${goalId}`)}>
              <View style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Talk to someone</Text>
              </View>
            </ScalePress>
          </View>
        </FadeInView>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1405' },
  scroll: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 22, color: '#F2F1EE' },
  headerTitle: { fontFamily: font.bodyBold, fontSize: fontSize.h3, color: '#F2F1EE' },
  messageSection: { marginBottom: spacing.xl },
  eyebrow: {
    fontFamily: font.bodySemiBold, fontSize: fontSize.eyebrow,
    color: '#F5C96B', textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: spacing.md,
  },
  headline: {
    fontFamily: font.displayBold, fontSize: 32,
    color: '#F2F1EE', lineHeight: 40, marginBottom: spacing.md,
  },
  subtext: {
    fontFamily: font.body, fontSize: fontSize.body,
    color: '#C9CBD2', lineHeight: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    width: (Dimensions.get('window').width - spacing.xl * 2 - spacing.md) / 2,
    backgroundColor: '#2B1A05',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3D2A0A',
  },
  statNumber: { fontFamily: font.displayBold, fontSize: 28 },
  statLabel: {
    fontFamily: font.body, fontSize: fontSize.caption,
    color: '#F5C96B', marginTop: spacing.xs,
  },
  statNote: {
    fontFamily: font.body, fontSize: 10,
    color: '#9A7A3A', marginTop: 2,
  },
  triggerSection: { marginBottom: spacing.xl },
  sectionTitle: {
    fontFamily: font.bodyBold, fontSize: fontSize.h3,
    color: '#F2F1EE', marginBottom: spacing.md,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: '#2B1A05',
    borderWidth: 1,
    borderColor: '#3D2A0A',
  },
  chipActive: { backgroundColor: '#F5A524', borderColor: '#F5A524' },
  chipText: {
    fontFamily: font.bodySemiBold, fontSize: fontSize.label,
    color: '#F5C96B',
  },
  chipTextActive: { color: '#1A1405' },
  whyCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  whyContent: { padding: spacing.lg },
  whyLabel: {
    fontFamily: font.bodySemiBold, fontSize: fontSize.eyebrow,
    color: '#F5C96B', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: spacing.xs,
  },
  whyText: {
    fontFamily: font.body, fontSize: fontSize.body,
    color: '#F2F1EE', lineHeight: 22,
  },
  actions: { gap: spacing.md },
  primaryBtn: {
    backgroundColor: '#F5A524',
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: font.bodyBold, fontSize: fontSize.h3,
    color: '#1A1405',
  },
  secondaryBtn: {
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F5C96B',
  },
  secondaryBtnText: {
    fontFamily: font.bodyBold, fontSize: fontSize.body,
    color: '#F5C96B',
  },
});