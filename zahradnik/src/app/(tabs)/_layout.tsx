import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabBarProps, Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, Glass, haptic, IconName, shadow } from '../../components/ui';

const TABS: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  index: { label: 'Dnes', icon: 'sunny-outline', iconActive: 'sunny' },
  plan: { label: 'Plán', icon: 'map-outline', iconActive: 'map' },
  zahrada: { label: 'Rostliny', icon: 'leaf-outline', iconActive: 'leaf' },
  diagnoza: { label: 'Poradna', icon: 'camera-outline', iconActive: 'camera' },
  nastaveni: { label: 'Více', icon: 'ellipsis-horizontal-circle-outline', iconActive: 'ellipsis-horizontal-circle' },
};

/** Plovoucí skleněná lišta ve stylu iOS. */
function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <Glass radius={34} intensity={60} style={[styles.bar, shadow.lg]}>
        <View style={styles.row}>
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
                style={({ pressed }) => [styles.item, focused && styles.itemActive, pressed && { transform: [{ scale: 0.92 }] }]}
              >
                <Ionicons name={focused ? tab.iconActive : tab.icon} size={23} color={focused ? colors.primary : colors.text} />
                <Text style={[styles.label, { color: focused ? colors.primary : colors.text }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Glass>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
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
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 14 },
  bar: { maxWidth: 480, width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 5 },
  item: { flex: 1, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', gap: 2 },
  itemActive: { backgroundColor: 'rgba(255,255,255,0.75)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  label: { ...font.medium, fontSize: 11 },
});
