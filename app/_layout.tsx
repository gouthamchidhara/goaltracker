import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { runMigrations } from '@/db/schema';
import { color } from '@/theme/tokens';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="northstar.db" onInit={runMigrations}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="goal/[id]" />
        <Stack.Screen name="goal/new" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="checkin" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="urge/[goalId]" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="comeback/[goalId]" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="focus/[goalId]" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="milestone/[id]" options={{ animation: 'fade', presentation: 'modal' }} />
      </Stack>
    </SQLiteProvider>
  );
}