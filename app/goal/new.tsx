import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useGoalStore } from '@/features/goals/store';
import { color, font, fontSize, spacing, radius, accentText, onAccent, ACCENT_NAMES, categoryAccent } from '@/theme/tokens';
import type { Goal, GoalType, Category, Horizon, EntryKind } from '@/db/types';
import { v4 as uuid } from 'uuid';

const GOAL_TYPES: { type: GoalType; label: string; desc: string }[] = [
  { type: 'countdown', label: 'Countdown', desc: 'Deadline-based — "Exam in 23 days"' },
  { type: 'streak', label: 'Streak', desc: 'Consecutive days — "Day 47 smoke-free"' },
  { type: 'quit', label: 'Quit', desc: 'Abstinence timer — "12d 4h sober"' },
  { type: 'target', label: 'Target', desc: 'Numeric target — "12 / 20 books"' },
  { type: 'habit', label: 'Habit', desc: 'Frequency per period — "3 / 5 this week"' },
  { type: 'milestone', label: 'Milestone', desc: 'Long-term with sub-goals — "4 / 9 steps"' },
];

const CATEGORIES: Category[] = ['education', 'health', 'fitness', 'finance', 'career', 'recovery', 'personal', 'custom'];

const EMOJI_OPTIONS = ['🎯', '📚', '💪', '🚭', '🏃', '💰', '🧘', '✍️', '🎸', '🍎', '💤', '🧠'];

export default function CreateGoalScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { addGoal } = useGoalStore();

  const [step, setStep] = useState(0);
  const [type, setType] = useState<GoalType>('streak');
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [accentColor, setAccentColor] = useState(color.violet);
  const [category, setCategory] = useState<Category>('personal');
  const [why, setWhy] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [unit, setUnit] = useState('');
  const [deadline, setDeadline] = useState('');
  const [pinnedToWidget, setPinnedToWidget] = useState(true);
  const [privateOnWidget, setPrivateOnWidget] = useState(false);

  const steps = ['Type', 'Details', 'Why', 'Widget'];

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your goal a name.');
      return;
    }
    if (!why.trim()) {
      Alert.alert('Why required', 'Knowing why you want this keeps you going.');
      return;
    }

    const now = new Date().toISOString();
    const goal: Goal = {
      id: uuid(),
      title: title.trim(),
      emoji,
      color: accentColor,
      type,
      horizon: 'short',
      category,
      why: why.trim(),
      startAt: now,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
      unit: unit.trim() || undefined,
      period: type === 'habit' ? 'week' : undefined,
      pinnedToWidget,
      privateOnWidget,
      pledgeEnabled: category === 'recovery',
      createdAt: now,
      updatedAt: now,
    };

    await addGoal(db, goal);
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Goal</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepBar}>
        {steps.map((s, i) => (
          <View key={s} style={[styles.stepDot, i <= step && styles.stepDotActive]} />
        ))}
      </View>
      <Text style={styles.stepLabel}>{steps[step]}</Text>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        {step === 0 && (
          <View>
            <Text style={styles.sectionTitle}>What kind of goal?</Text>
            {GOAL_TYPES.map(t => (
              <TouchableOpacity
                key={t.type}
                style={[styles.typeCard, type === t.type && styles.typeCardActive]}
                onPress={() => setType(t.type)}
              >
                <Text style={[styles.typeLabel, type === t.type && styles.typeLabelActive]}>{t.label}</Text>
                <Text style={styles.typeDesc}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Goal details</Text>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Pass AWS SAA exam"
              placeholderTextColor={color.textMuted}
            />

            <Text style={styles.fieldLabel}>Icon</Text>
            <View style={styles.emojiRow}>
              {EMOJI_OPTIONS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
                  onPress={() => setEmoji(e)}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorRow}>
              {ACCENT_NAMES.map(name => (
                <TouchableOpacity
                  key={name}
                  style={[styles.colorSwatch, { backgroundColor: (color as any)[name] }, accentColor === (color as any)[name] && styles.colorSwatchActive]}
                  onPress={() => setAccentColor((color as any)[name])}
                />
              ))}
            </View>

            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, category === c && styles.chipActive]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {type === 'target' && (
              <>
                <Text style={styles.fieldLabel}>Target value</Text>
                <TextInput
                  style={styles.input}
                  value={targetValue}
                  onChangeText={setTargetValue}
                  placeholder="e.g. 20"
                  placeholderTextColor={color.textMuted}
                  keyboardType="numeric"
                />
                <Text style={styles.fieldLabel}>Unit</Text>
                <TextInput
                  style={styles.input}
                  value={unit}
                  onChangeText={setUnit}
                  placeholder="e.g. books, km, $"
                  placeholderTextColor={color.textMuted}
                />
              </>
            )}

            {(type === 'countdown' || type === 'target' || type === 'milestone') && (
              <>
                <Text style={styles.fieldLabel}>Deadline (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={deadline}
                  onChangeText={setDeadline}
                  placeholder="2026-12-15"
                  placeholderTextColor={color.textMuted}
                />
              </>
            )}
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.sectionTitle}>Why this matters</Text>
            <Text style={styles.fieldLabel}>
              This is your anchor — shown on low days and after slips.
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={why}
              onChangeText={setWhy}
              placeholder="e.g. For Maya. For my lungs. To prove I can."
              placeholderTextColor={color.textMuted}
              multiline
              numberOfLines={4}
            />
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.sectionTitle}>Widget & privacy</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Pin to widget</Text>
              <Switch value={pinnedToWidget} onValueChange={setPinnedToWidget} trackColor={{ true: color.violet }} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Private on lock screen</Text>
              <Switch value={privateOnWidget} onValueChange={setPrivateOnWidget} trackColor={{ true: color.amber }} />
            </View>
            {privateOnWidget && (
              <Text style={styles.privacyNote}>
                Only emoji and number shown on lock screen. Title hidden.
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer buttons */}
      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        {step < 3 ? (
          <TouchableOpacity style={styles.nextButton} onPress={() => setStep(s => s + 1)}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
            <Text style={styles.createButtonText}>Create goal</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: color.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 22, color: color.text },
  headerTitle: { fontFamily: font.bodyBold, fontSize: fontSize.h3, color: color.text },
  stepBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xs,
  },
  stepDot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: color.track },
  stepDotActive: { backgroundColor: color.violet },
  stepLabel: {
    fontFamily: font.bodySemiBold,
    fontSize: fontSize.caption,
    color: color.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  form: { flex: 1 },
  formContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  sectionTitle: {
    fontFamily: font.displayBold,
    fontSize: fontSize.h1,
    color: color.text,
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontFamily: font.bodySemiBold,
    fontSize: fontSize.label,
    color: color.textSoft,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    fontFamily: font.body,
    fontSize: fontSize.body,
    color: color.text,
    borderWidth: 1,
    borderColor: color.track,
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  typeCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm + 2,
    borderWidth: 1.5,
    borderColor: color.track,
  },
  typeCardActive: { borderColor: color.violet, backgroundColor: color.surface2 },
  typeLabel: { fontFamily: font.bodyBold, fontSize: fontSize.h3, color: color.text },
  typeLabelActive: { color: accentText.violet },
  typeDesc: { fontFamily: font.body, fontSize: fontSize.label, color: color.textMuted, marginTop: 2 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.track,
  },
  emojiBtnActive: { borderColor: color.violet, backgroundColor: color.surface2 },
  emojiText: { fontSize: 22 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },
  colorSwatchActive: { borderWidth: 3, borderColor: color.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.track,
  },
  chipActive: { backgroundColor: color.violet, borderColor: color.violet },
  chipText: { fontFamily: font.bodySemiBold, fontSize: fontSize.label, color: color.textSoft },
  chipTextActive: { color: '#120D2B' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  switchLabel: { fontFamily: font.body, fontSize: fontSize.body, color: color.text },
  privacyNote: { fontFamily: font.body, fontSize: fontSize.caption, color: color.textMuted, marginTop: spacing.sm },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: color.track,
    backgroundColor: color.bg,
  },
  backButton: {
    flex: 1,
    height: 52,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { fontFamily: font.bodyBold, fontSize: fontSize.body, color: color.textSoft },
  nextButton: {
    flex: 2,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: color.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: { fontFamily: font.bodyBold, fontSize: fontSize.body, color: '#120D2B' },
  createButton: {
    flex: 3,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: color.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: { fontFamily: font.bodyBold, fontSize: fontSize.body, color: '#071F1A' },
});