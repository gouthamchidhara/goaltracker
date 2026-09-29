import { Tabs } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { color, font, fontSize, spacing } from '@/theme/tokens';

function TabIcon({ focused, label }: { focused: boolean; label: string }) {
  return (
    <View style={styles.iconWrap}>
      <Text style={[styles.iconLabel, focused && styles.iconLabelActive]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopColor: color.track,
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarActiveTintColor: color.text,
        tabBarInactiveTintColor: color.textMuted,
        tabBarLabelStyle: {
          fontFamily: font.bodySemiBold,
          fontSize: fontSize.caption,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="◉" />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="◈" />,
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: 'Awards',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="★" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="⚙" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  iconLabel: { fontSize: 18, color: color.textMuted },
  iconLabelActive: { color: color.text },
});