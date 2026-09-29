import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { color, font, fontSize, spacing, radius } from '@/theme/tokens';

interface ContributionGridProps {
  data: string; // 84 chars: '0'=before start, '1'=done, '2'=slip, '3'=miss
  goalColor: string;
  weeks?: number;
  onDayPress?: (dayIndex: number, status: string) => void;
}

export function ContributionGrid({ data, goalColor, weeks = 12, onDayPress }: ContributionGridProps) {
  const chars = data.split('');
  const daysPerWeek = 7;
  const totalDays = weeks * daysPerWeek;
  const padded = chars.length >= totalDays ? chars.slice(-totalDays) : [
    ...Array(totalDays - chars.length).fill('0'),
    ...chars,
  ];

  const columns: string[][] = [];
  for (let w = 0; w < weeks; w++) {
    columns.push(padded.slice(w * daysPerWeek, (w + 1) * daysPerWeek));
  }

  const getDayColor = (status: string) => {
    switch (status) {
      case '1': return goalColor;
      case '2': return color.slip;
      case '3': return color.missed;
      default: return color.track;
    }
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <View style={styles.grid}>
        {columns.map((col, ci) => (
          <View key={ci} style={styles.column}>
            {col.map((status, ri) => (
              <TouchableOpacity
                key={ri}
                style={[styles.cell, { backgroundColor: getDayColor(status) }]}
                onPress={() => onDayPress?.(ci * daysPerWeek + ri, status)}
                activeOpacity={0.7}
              />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

interface ContributionLegendProps {
  goalColor: string;
}

export function ContributionLegend({ goalColor }: ContributionLegendProps) {
  return (
    <View style={styles.legend}>
      <LegendItem color={color.track} label="Before start" />
      <LegendItem color={goalColor} label="Done" />
      <LegendItem color={color.slip} label="Slip" />
      <LegendItem color={color.missed} label="Miss" />
    </View>
  );
}

function LegendItem({ color: c, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: c }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingRight: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    gap: 3,
  },
  column: {
    gap: 3,
  },
  cell: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendLabel: {
    fontFamily: font.body,
    fontSize: 10,
    color: color.textMuted,
  },
});