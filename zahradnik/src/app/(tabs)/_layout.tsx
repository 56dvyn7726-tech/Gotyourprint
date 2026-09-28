import { Tabs } from 'expo-router/js-tabs';
import { Text } from 'react-native';
import { colors } from '../../components/ui';

function icon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.primaryDark,
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dnes', tabBarIcon: icon('🌤️') }} />
      <Tabs.Screen name="zahrada" options={{ title: 'Moje zahrada', tabBarLabel: 'Zahrada', tabBarIcon: icon('🪴') }} />
      <Tabs.Screen name="diagnoza" options={{ title: 'Poradna – foto', tabBarLabel: 'Poradna', tabBarIcon: icon('📷') }} />
      <Tabs.Screen name="nastaveni" options={{ title: 'Nastavení', tabBarIcon: icon('⚙️') }} />
    </Tabs>
  );
}
