import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { Backdrop, colors, font } from '../components/ui';
import { StoreProvider } from '../lib/store';

// Navigace nesmí kreslit vlastní (šedé) pozadí, jinak by zakryla barevné pozadí aplikace.
const THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent', card: 'transparent', primary: colors.water },
};

export default function RootLayout() {
  return (
    <StoreProvider>
      <ThemeProvider value={THEME}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Barevné pozadí prosvítá skleněnými panely všech obrazovek. */}
          <Backdrop />
          <Stack
            screenOptions={{
              headerShadowVisible: false,
              headerStyle: { backgroundColor: 'transparent' },
              headerTintColor: colors.water,
              headerTitleStyle: { ...font.semibold, fontSize: 17, color: colors.text },
              contentStyle: { backgroundColor: 'transparent' },
              headerBackTitle: 'Zpět',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="katalog" options={{ title: 'Přidat rostlinu' }} />
            <Stack.Screen name="pridat/[plantId]" options={{ title: '' }} />
            <Stack.Screen name="rostlina" options={{ headerShown: false }} />
            <Stack.Screen name="poloha" options={{ headerShown: false }} />
          </Stack>
        </View>
      </ThemeProvider>
    </StoreProvider>
  );
}
