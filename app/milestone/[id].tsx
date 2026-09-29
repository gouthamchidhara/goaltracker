import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { color, font, fontSize, spacing, radius, accentText } from '@/theme/tokens';
import { ProgressRing } from '@/components/ProgressRing';
import { AnimatedNumber, FadeInView, ScalePress } from '@/components/AnimatedNumber';
import { Confetti } from '@/components/Confetti';

const { width } = Dimensions.get('window');

export default function MilestoneScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showConfetti, setShowConfetti] = useState(true);

  // Parse milestone from id: e.g. "g123_60" -> goalId "g123", milestone 60
  const [goalId, milestone] = (id ?? '').split('_');

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeInView delay={300}>
          <View style={styles.center}>
            {/* Badge ring */}
            <View style={styles.badgeSection}>
              <ProgressRing progress={1} size={180} strokeWidth={16} color={color.teal} delay={500}>
                <AnimatedNumber
                  value={parseInt(milestone) || 60}
                  style={styles.badgeNumber}
                  delay={800}
                />
                <Text style={styles.badgeUnit}>days</Text>
              </ProgressRing>
            </View>

            {/* Headline */}
            <Text style={styles.headline}>
              {parseInt(milestone) >= 60 ? 'Two months!' : `${milestone} days!`}
            </Text>
            <Text style={styles.subtext}>
              You've proven you can do this. Keep going.
            </Text>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{milestone}</Text>
                <Text style={styles.statLabel}>Days</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: color.emerald }]}>
                  ${Math.floor(parseInt(milestone) * 5)}
                </Text>
                <Text style={styles.statLabel}>Saved</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: color.violet }]}>+250</Text>
                <Text style={styles.statLabel}>XP earned</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <ScalePress onPress={() => router.back()}>
                <View style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Keep going</Text>
                </View>
              </ScalePress>
              <ScalePress onPress={() => { /* TODO: share card */ }}>
                <View style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Share milestone</Text>
                </View>
              </ScalePress>
            </View>
          </View>
        </FadeInView>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.bg },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingHorizontal: spacing.xl,
  },
  center: { alignItems: 'center' },
  badgeSection: { marginBottom: spacing.xxl },
  badgeNumber: {
    fontFamily: font.displayBold, fontSize: 52,
    color: color.text,
  },
  badgeUnit: {
    fontFamily: font.body, fontSize: fontSize.caption,
    color: color.textMuted,
  },
  headline: {
    fontFamily: font.displayBold, fontSize: 36,
    color: color.text, textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtext: {
    fontFamily: font.body, fontSize: fontSize.body,
    color: color.textMuted, textAlign: 'center',
    marginBottom: spacing.xxl, lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: color.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    width: '100%',
    marginBottom: spacing.xxl,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: {
    fontFamily: font.displayBold, fontSize: 24,
    color: color.text,
  },
  statLabel: {
    fontFamily: font.body, fontSize: fontSize.caption,
    color: color.textMuted, marginTop: 2,
  },
  statDivider: { width: 1, height: 32, backgroundColor: color.track },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
  primaryBtn: {
    backgroundColor: color.teal,
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: font.bodyBold, fontSize: fontSize.h3,
    color: '#071F1A',
  },
  secondaryBtn: {
    borderRadius: radius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: color.border,
  },
  secondaryBtnText: {
    fontFamily: font.bodyBold, fontSize: fontSize.body,
    color: color.textSoft,
  },
});