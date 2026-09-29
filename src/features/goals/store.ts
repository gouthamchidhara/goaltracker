/**
 * Zustand store for goals — wraps the repository and provides reactive state.
 */

import { create } from 'zustand';
import type { Goal, Entry, StreakRecord, DerivedGoalStats } from '@/db/types';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as repo from '@/db/repository';
import { computeAllStats } from './derived';

interface GoalStore {
  goals: Goal[];
  entries: Record<string, Entry[]>;   // goalId -> entries
  streakRecords: Record<string, StreakRecord[]>;
  stats: Record<string, DerivedGoalStats>;
  loading: boolean;
  error: string | null;

  loadAll: (db: SQLiteDatabase) => Promise<void>;
  addGoal: (db: SQLiteDatabase, goal: Goal) => Promise<void>;
  updateGoal: (db: SQLiteDatabase, id: string, updates: Partial<Goal>) => Promise<void>;
  deleteGoal: (db: SQLiteDatabase, id: string) => Promise<void>;
  addEntry: (db: SQLiteDatabase, entry: Entry) => Promise<void>;
  refreshStats: (db: SQLiteDatabase) => Promise<void>;
  getGoalStats: (goalId: string) => DerivedGoalStats | undefined;
  getGoalEntries: (goalId: string) => Entry[];
}

export const useGoalStore = create<GoalStore>((set, get) => ({
  goals: [],
  entries: {},
  streakRecords: {},
  stats: {},
  loading: false,
  error: null,

  loadAll: async (db) => {
    set({ loading: true, error: null });
    try {
      const goals = await repo.listGoals(db);
      const entries: Record<string, Entry[]> = {};
      const streakRecords: Record<string, StreakRecord[]> = {};

      for (const g of goals) {
        entries[g.id] = await repo.listEntries(db, g.id);
        streakRecords[g.id] = await repo.listStreakRecords(db, g.id);
      }

      const stats: Record<string, DerivedGoalStats> = {};
      for (const g of goals) {
        stats[g.id] = computeAllStats(g, entries[g.id] ?? [], streakRecords[g.id] ?? []);
      }

      set({ goals, entries, streakRecords, stats, loading: false });
    } catch (e: any) {
      set({ error: e?.message ?? 'Failed to load', loading: false });
    }
  },

  addGoal: async (db, goal) => {
    await repo.insertGoal(db, goal);
    const { goals, entries, streakRecords } = get();
    const allEntries = entries[goal.id] ?? [];
    const allSR = streakRecords[goal.id] ?? [];
    set({
      goals: [...goals, goal],
      entries: { ...entries, [goal.id]: allEntries },
      streakRecords: { ...streakRecords, [goal.id]: allSR },
      stats: { ...get().stats, [goal.id]: computeAllStats(goal, allEntries, allSR) },
    });
  },

  updateGoal: async (db, id, updates) => {
    await repo.updateGoal(db, id, updates);
    const { goals, entries, streakRecords, stats } = get();
    const updated = goals.map(g => (g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g));
    const goal = updated.find(g => g.id === id);
    set({
      goals: updated,
      stats: goal ? { ...stats, [id]: computeAllStats(goal, entries[id] ?? [], streakRecords[id] ?? []) } : stats,
    });
  },

  deleteGoal: async (db, id) => {
    await repo.deleteGoal(db, id);
    const { goals, entries, streakRecords, stats } = get();
    const e2 = { ...entries }; delete e2[id];
    const s2 = { ...streakRecords }; delete s2[id];
    const st2 = { ...stats }; delete st2[id];
    set({ goals: goals.filter(g => g.id !== id), entries: e2, streakRecords: s2, stats: st2 });
  },

  addEntry: async (db, entry) => {
    await repo.insertEntry(db, entry);
    const { goals, entries, streakRecords, stats } = get();
    const goalEntries = [...(entries[entry.goalId] ?? []), entry];
    const goal = goals.find(g => g.id === entry.goalId);
    set({
      entries: { ...entries, [entry.goalId]: goalEntries },
      stats: goal
        ? { ...stats, [entry.goalId]: computeAllStats(goal, goalEntries, streakRecords[entry.goalId] ?? []) }
        : stats,
    });
  },

  refreshStats: async (db) => {
    const { goals, entries, streakRecords } = get();
    const stats: Record<string, DerivedGoalStats> = {};
    for (const g of goals) {
      stats[g.id] = computeAllStats(g, entries[g.id] ?? [], streakRecords[g.id] ?? []);
    }
    set({ stats });
  },

  getGoalStats: (goalId) => get().stats[goalId],
  getGoalEntries: (goalId) => get().entries[goalId] ?? [],
}));