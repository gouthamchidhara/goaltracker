import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Platform, Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useGoalStore } from '@/features/goals/store';
import { color, font, fontSize, spacing, radius, accentText } from '@/theme/tokens';
import { BreathingOrb, PulsingDot } from '@/components/BreathingOrb';
import { FadeInView, ScalePress } from '@/components/AnimatedNumber';
import { v4 as uuid } from 'uuid';

const SUPPORT_CONTACTS = [
  { name: 'Call my sponsor', number: '', icon: '📞' },
  { name: '988 Crisis Lifeline', number: '988', icon: '💬' },
  { name: 'SAMHSA Helpline', number: '18006624357', icon: '🏥' },
];

export default function UrgeScreen() {
  const router = useRouter();
  const { goalId } = useLocalSearchParams<{ goalId: string }>();
  const db = useSQLiteContext();
  const { goals, loadAll, addEntry } = useGoalStore();

  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [isActive, setIsActive] = useState(true);
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [logged, setLogged] = useState(false);

  useFocusEffect(useCallback(() => { loadAll(db); }, [db]));

  const goal = goals.find(g => g.id === goalId);

  // Breathing timer: 4s in, 2s hold, 4s out = 10s cycle
  useEffect(() => {
    if (!isActive) return;
    const phaseTimer = setInterval(() => {
      setPhase(p => {
        if (p === 'in') return 'hold';
        if (p === 'hold') return 'out';
        return 'in';
      });
    }, 4000); // Simplified: 4s per phase

    const countdown = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setIsActive(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(phaseTimer);
      clearInterval(countdown);
    };
  }, [isActive]);

  const handleMadeItThrough = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (goal) {
      await addEntry(db, {
        id: uuid(),
        goalId: goal.id,
        kind: 'urge_resisted',
        at: new Date().toISOString(),
      });
    }
    setLogged(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ride the wave</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Headline */}
        <FadeInView delay={0}>
          <Text style={styles.headline}>Urges peak, then pass.</Text>
          <Text style={styles.subheadline}>Stay with it for five minutes. Just breathe.</Text>
        </FadeInView>

        {/* Breathing orb */}
        <FadeInView delay={200}>
          <View style={styles.orbSection}>
            <BreathingOrb isActive={isActive} timeLeft={timeLeft} phase={phase} />
          </View>
        </FadeInView>

        {/* Why card */}
        {goal?.why && (
          <FadeInView delay={400}>
            <View style={styles.whyCard}>
              <LinearGradient
                colors={[color.amber + '15', color.surface]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />
              <View style={styles.whyContent}>
                <Text style={styles.whyLabel}>Remember why</Text>
                <Text style={styles.whyText}>{goal.why}</Text>
              </View>
            </View>
          </FadeInView>
        )}

        {/* Support contacts */}
        <FadeInView delay={500}>
          <Text style={styles.sectionTitle}>Talk to someone</Text>
          <View style={styles.contactsRow}>
            {SUPPORT_CONTACTS.map((c, i) => (
              <ScalePress key={i} onPress={() => c.number && Linking.openURL(`tel:${c.number}`)}>
                <View style={styles.contactBtn}>
                  <Text style={styles.contactIcon}>{c.icon}</Text>
                  <Text style={styles.contactName}>{c.name}</Text>
                </View>
              </ScalePress>
            ))}
          </View>
        </FadeInView>

        {/* Main action */}
        <FadeInView delay={600}>
          <View style={styles.actionSection}>
            {logged ? (
              <View style={styles.loggedBtn}>
                <Text style={styles.loggedBtnText}>Logged · +50 XP</Text>
              </View>
            ) : (
              <ScalePress onPress={handleMadeItThrough}>
                <View style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>I made it through</Text>
                </View>
              </ScalePress>
            )}
            <Text style={styles.actionSub}>Available anytime — not just after the timer</Text>
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
  headline: {
    fontFamily: font.displayBold, fontSize: 32, color: '#F2F1EE',
    textAlign: 'center', marginBottom: spacing.sm,
  },
  subheadline: {
    fontFamily: font.body, fontSize: fontSize.body, color: '#8CC4FF',
    textAlign: 'center', marginBottom: spacing.xl,
  },
  orbSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  whyCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  whyContent: { padding: spacing.lg },
  whyLabel: {
    fontFamily: font.bodySemiBold, fontSize: fontSize.eyebrow,
    color: '#8CC4FF', textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: spacing.xs,
  },
  whyText: {
    fontFamily: font.body, fontSize: fontSize.body,
    color: '#F2F1EE', lineHeight: 24,
  },
  sectionTitle: {
    fontFamily: font.bodyBold, fontSize: fontSize.h2,
    color: '#F2F1EE', marginBottom: spacing.md,
  },
  contactsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  contactBtn: {
    flex: 1,
    backgroundColor: '#1A2A3E',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#23405F',
  },
  contactIcon: { fontSize: 22, marginBottom: spacing.xs },
  contactName: {
    fontFamily: font.bodySemiBold, fontSize: 11,
    color: '#8CC4FF', textAlign: 'center',
  },
  actionSection: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryBtn: {
    backgroundColor: '#8CC4FF',
    borderRadius: radius.full,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md + 2,
    width: '100%',
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: font.bodyBold, fontSize: fontSize.h3,
    color: '#0B1E33',
  },
  loggedBtn: {
    backgroundColor: '#2EC4A5',
    borderRadius: radius.full,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md + 2,
    width: '100%',
    alignItems: 'center',
  },
  loggedBtnText: {
    fontFamily: font.bodyBold, fontSize: fontSize.h3,
    color: '#071F1A',
  },
  actionSub: {
    fontFamily: font.body, fontSize: fontSize.caption,
    color: '#5A7A9A', marginTop: spacing.md, textAlign: 'center',
  },
});