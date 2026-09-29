import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Platform,
} from 'react-native';
import { color, font, fontSize, spacing, radius } from '@/theme/tokens';
import { FadeInView } from '@/components/AnimatedNumber';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeInView delay={0} direction="down">
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Your preferences</Text>
        </FadeInView>

        <FadeInView delay={100}>
          <Section label="Appearance">
            <SettingRow label="Dark mode" value="On" />
            <SettingRow label="Theme" value="Midnight" />
            <SettingRow label="Accent color" value="Violet" />
          </Section>
        </FadeInView>

        <FadeInView delay={150}>
          <Section label="Notifications">
            <SettingRow label="Morning pledge" value="7:00 AM" />
            <SettingRow label="Evening review" value="9:00 PM" />
            <SettingRow label="Daily reminders" value="3 max/day" />
          </Section>
        </FadeInView>

        <FadeInView delay={200}>
          <Section label="Privacy">
            <SettingRow label="App lock" value="Off" />
            <SettingRow label="Private goals" value="Recovery default" />
            <SettingRow label="Export data" value="JSON" />
            <SettingRow label="Delete all data" value="" danger />
          </Section>
        </FadeInView>

        <FadeInView delay={250}>
          <Section label="Health connections">
            <SettingRow label={Platform.OS === 'ios' ? 'Apple Health' : 'Health Connect'} value="Not connected" />
            <SettingRow label="Auto-log steps" value="Off" />
            <SettingRow label="Auto-log workouts" value="Off" />
          </Section>
        </FadeInView>

        <FadeInView delay={300}>
          <Section label="Widgets">
            <SettingRow label="Widget Studio" value="Customize →" />
            <SettingRow label="Lock screen widgets" value="Configure →" />
          </Section>
        </FadeInView>

        <FadeInView delay={350}>
          <Section label="About">
            <SettingRow label="Version" value="1.0.0" />
            <SettingRow label="Privacy policy" value="→" />
            <SettingRow label="Terms of service" value="→" />
          </Section>
        </FadeInView>

        <FadeInView delay={400}>
          <Section label="TODO(owner)">
            <Text style={styles.todoItem}>• Bundle identifiers</Text>
            <Text style={styles.todoItem}>• App Group ID</Text>
            <Text style={styles.todoItem}>• App icon and store assets</Text>
            <Text style={styles.todoItem}>• RevenueCat keys (Phase 5)</Text>
            <Text style={styles.todoItem}>• Backend URLs (Phase 5)</Text>
          </Section>
        </FadeInView>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: spacing.xl }}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function SettingRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={styles.settingRow}>
      <Text style={[styles.settingLabel, danger && styles.dangerText]}>{label}</Text>
      <Text style={[styles.settingValue, danger && styles.dangerText]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.bg },
  scroll: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: spacing.xl },
  title: { fontFamily: font.displayBold, fontSize: 36, color: color.text },
  subtitle: { fontFamily: font.body, fontSize: fontSize.body, color: color.textMuted, marginTop: spacing.xs },
  sectionLabel: {
    fontFamily: font.bodySemiBold, fontSize: fontSize.caption,
    color: color.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.8, marginBottom: spacing.sm,
  },
  card: { backgroundColor: color.surface, borderRadius: radius.lg, padding: spacing.sm },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md + 2, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: color.track,
  },
  settingLabel: { fontFamily: font.body, fontSize: fontSize.body, color: color.text },
  settingValue: { fontFamily: font.bodySemiBold, fontSize: fontSize.label, color: color.textMuted },
  dangerText: { color: '#FF6B6B' },
  todoItem: {
    fontFamily: font.body, fontSize: fontSize.body,
    color: color.textMuted, marginBottom: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
});