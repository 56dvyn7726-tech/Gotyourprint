import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, colors, fonts, IconName, Input, T, TAB_BAR_SPACE } from '../../components/ui';
import { notify } from '../../lib/dialog';
import { formatArea, polygonArea } from '../../lib/geo';
import { cancelReminders, scheduleDailyReminder } from '../../lib/notifications';
import { useStore } from '../../lib/store';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { garden, settings, updateGarden, updateSettings } = useStore();
  const [name, setName] = useState(garden.name);
  const [area, setArea] = useState(String(garden.areaM2));
  const [apiKey, setApiKey] = useState(settings.apiKey);

  useEffect(() => setName(garden.name), [garden.name]);
  useEffect(() => setArea(String(garden.areaM2)), [garden.areaM2]);
  useEffect(() => setApiKey(settings.apiKey), [settings.apiKey]);

  // Oznámení na pozadí prohlížeč neumí – ve webové verzi připomínku skryjeme.
  const canNotify = Platform.OS !== 'web';

  // Připomínku přeplánuj, když se změní počet rostlin (mění se text oznámení).
  useEffect(() => {
    if (canNotify && settings.notifyEnabled) scheduleDailyReminder(settings.notifyHour, garden.plants.length).catch(() => {});
  }, [canNotify, garden.plants.length, settings.notifyEnabled, settings.notifyHour]);

  const toggleNotify = async (on: boolean) => {
    if (on) {
      const ok = await scheduleDailyReminder(settings.notifyHour, garden.plants.length);
      if (!ok) {
        notify('Oznámení nepovolena', 'Povol oznámení pro Zahradníka v nastavení telefonu.');
        return;
      }
    } else {
      await cancelReminders();
    }
    updateSettings({ notifyEnabled: on });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]} keyboardShouldPersistTaps="handled">
        <T v="h1" style={{ marginBottom: 16 }}>
          Nastavení
        </T>

        <Group title="Zahrada">
          <Row icon="location" tint={colors.primary} title="Poloha na mapě" value={garden.location?.label ?? 'Nenastaveno'} onPress={() => router.push('/poloha')} />
          <Row
            icon="map"
            tint="#2E7D6B"
            title="Hranice a plán"
            value={garden.outline ? `obkresleno · ${formatArea(polygonArea(garden.outline))}` : 'zatím neobkresleno'}
            onPress={() => router.push('/plan')}
          />
          <View style={styles.field}>
            <T v="caption">Název zahrady</T>
            <Input value={name} onChangeText={setName} onEndEditing={() => updateGarden({ name: name.trim() || 'Moje zahrada' })} onBlur={() => updateGarden({ name: name.trim() || 'Moje zahrada' })} style={{ marginTop: 6 }} />
          </View>
          {!garden.outline && (
            <View style={styles.field}>
              <T v="caption">Rozloha (m²)</T>
              <Input
                value={area}
                onChangeText={setArea}
                keyboardType="decimal-pad"
                onBlur={() => {
                  const n = parseFloat(area.replace(',', '.'));
                  if (Number.isFinite(n) && n > 0) updateGarden({ areaM2: n });
                }}
                style={{ marginTop: 6 }}
              />
              <T v="small" style={{ marginTop: 6 }}>
                Tip: obkresli zahradu na plánu a rozloha se spočítá sama.
              </T>
            </View>
          )}
        </Group>

        {canNotify && (
          <Group title="Připomínky">
            <View style={styles.row}>
              <IconTile icon="notifications" tint={colors.sun} />
              <Text style={styles.rowTitle}>Ranní rada na zahradu</Text>
              <Switch value={settings.notifyEnabled} onValueChange={toggleNotify} trackColor={{ true: colors.primaryBright, false: colors.border }} />
            </View>
            {settings.notifyEnabled && (
              <View style={[styles.wrap, { paddingHorizontal: 14, paddingBottom: 8 }]}>
                {[6, 7, 8, 9, 18, 19].map((h) => (
                  <Chip key={h} label={`${h}:00`} selected={settings.notifyHour === h} onPress={() => updateSettings({ notifyHour: h })} />
                ))}
              </View>
            )}
          </Group>
        )}

        <Group title="Poradna s fotkou">
          <View style={styles.field}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <IconTile icon="sparkles" tint="#7A45A0" />
              <T v="small" style={{ flex: 1 }}>
                Rozpoznání problémů z fotky používá AI Claude. Vlož API klíč z console.anthropic.com – zůstane uložený jen v tomto
                zařízení.
              </T>
            </View>
            <Input
              icon="key"
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="sk-ant-…"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={{ marginTop: 12 }}
            />
            <Button
              title={settings.apiKey ? 'Uložit nový klíč' : 'Uložit klíč'}
              icon="save"
              variant="soft"
              small
              onPress={() => {
                updateSettings({ apiKey: apiKey.trim() });
                notify('Uloženo', apiKey.trim() ? 'API klíč je uložen.' : 'API klíč byl odstraněn.');
              }}
              style={{ marginTop: 10 }}
            />
            {settings.apiKey ? (
              <View style={styles.ok}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primaryBright} />
                <Text style={styles.okText}>Klíč je nastaven</Text>
              </View>
            ) : null}
          </View>
        </Group>

        <Group title="O aplikaci">
          <View style={styles.field}>
            <T v="small">
              Počasí: Open-Meteo.com · Satelitní snímky: Esri, Maxar, Earthstar Geographics · Adresy: © přispěvatelé OpenStreetMap
            </T>
            <T v="small" style={{ marginTop: 6 }}>
              Zahradník 1.1
            </T>
          </View>
        </Group>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <T v="caption" style={{ marginLeft: 6, marginBottom: 8 }}>
        {title}
      </T>
      <Card padded={false} style={{ paddingVertical: 4 }}>
        {children}
      </Card>
    </View>
  );
}

function IconTile({ icon, tint }: { icon: IconName; tint: string }) {
  return (
    <View style={[styles.iconTile, { backgroundColor: tint }]}>
      <Ionicons name={icon} size={18} color={colors.white} />
    </View>
  );
}

function Row({ icon, tint, title, value, onPress }: { icon: IconName; tint: string; title: string; value: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bg }]}>
      <IconTile icon={icon} tint={tint} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: TAB_BAR_SPACE },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  rowTitle: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  rowValue: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, marginTop: 1 },
  iconTile: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  field: { paddingHorizontal: 14, paddingVertical: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  ok: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  okText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.primaryBright },
});
