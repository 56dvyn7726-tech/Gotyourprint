import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBarProps, Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, haptic, IconName, shadow } from '../../components/ui';

const TABS: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  index: { label: 'Dnes', icon: 'sunny-outline', iconActive: 'sunny' },
  plan: { label: 'Plán', icon: 'map-outline', iconActive: 'map' },
  zahrada: { label: 'Rostliny', icon: 'leaf-outline', iconActive: 'leaf' },
  diagnoza: { label: 'Poradna', icon: 'camera-outline', iconActive: 'camera' },
  nastaveni: { label: 'Více', icon: 'options-outline', iconActive: 'options' },
};

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={[styles.bar, shadow.lg]}>
        {state.routes.map((route, i) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === i;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  haptic();
                  navigation.navigate(route.name);
                }
              }}
              style={[styles.item, focused && styles.itemActive]}
            >
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={21} color={focused ? colors.white : colors.muted} />
              {focused && <Text style={styles.label}>{tab.label}</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="zahrada" />
      <Tabs.Screen name="diagnoza" />
      <Tabs.Screen name="nastaveni" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 16 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 999,
    padding: 6,
    gap: 2,
    maxWidth: 480,
    width: '100%',
    justifyContent: 'space-between',
  },
  item: {
    height: 50,
    minWidth: 50,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  itemActive: { backgroundColor: colors.forest, paddingHorizontal: 16 },
  label: { color: colors.white, fontFamily: fonts.bold, fontSize: 14 },
});
