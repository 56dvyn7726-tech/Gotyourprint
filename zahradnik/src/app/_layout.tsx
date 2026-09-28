import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../components/ui';
import { StoreProvider } from '../lib/store';

export default function RootLayout() {
  return (
    <StoreProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.primaryDark,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
          headerBackTitle: 'Zpět',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="katalog" options={{ title: 'Vyber rostlinu', presentation: 'modal' }} />
        <Stack.Screen name="pridat/[plantId]" options={{ title: 'Přidat na zahradu' }} />
        <Stack.Screen name="rostlina/[uid]" options={{ title: 'Rostlina' }} />
      </Stack>
    </StoreProvider>
  );
}
