import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, colors, Muted, SectionTitle } from '../../components/ui';
import { notify } from '../../lib/dialog';
import { cancelReminders, scheduleDailyReminder } from '../../lib/notifications';
import { useStore } from '../../lib/store';
import { Place, searchPlaces } from '../../lib/weather';

export default function SettingsScreen() {
  const { garden, settings, updateGarden, updateSettings } = useStore();
  const [name, setName] = useState(garden.name);
  const [area, setArea] = useState(String(garden.areaM2));
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
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

  const useGps = async () => {
    setBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        notify('Bez polohy', 'Povol přístup k poloze, nebo vyhledej obec ručně.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let label = `Moje poloha (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`;
      try {
        const [addr] = await Location.reverseGeocodeAsync(pos.coords);
        if (addr) label = [addr.city ?? addr.subregion, addr.region].filter(Boolean).join(', ') || label;
      } catch {
        // Bez názvu místa se obejdeme.
      }
      updateGarden({ location: { lat: pos.coords.latitude, lon: pos.coords.longitude, label } });
    } catch (e: any) {
      notify('Poloha nedostupná', e?.message ?? 'Zkus to venku nebo vyhledej obec ručně.');
    } finally {
      setBusy(false);
    }
  };

  const search = async () => {
    if (!query.trim()) return;
    setBusy(true);
    try {
      setPlaces(await searchPlaces(query.trim()));
    } catch (e: any) {
      notify('Chyba', e?.message ?? 'Vyhledávání selhalo.');
    } finally {
      setBusy(false);
    }
  };

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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <SectionTitle>Zahrada</SectionTitle>
        <Card>
          <Text style={styles.label}>Název</Text>
          <TextInput value={name} onChangeText={setName} onEndEditing={() => updateGarden({ name: name.trim() || 'Moje zahrada' })} style={styles.input} />
          <Text style={styles.label}>Celková rozloha (m²)</Text>
          <TextInput
            value={area}
            onChangeText={setArea}
            onEndEditing={() => {
              const n = parseFloat(area.replace(',', '.'));
              if (Number.isFinite(n) && n > 0) updateGarden({ areaM2: n });
            }}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </Card>

        <SectionTitle>Poloha (pro počasí)</SectionTitle>
        <Card>
          <Text style={styles.current}>📍 {garden.location?.label ?? 'Nenastaveno'}</Text>
          <Button title="Použít aktuální polohu" onPress={useGps} loading={busy} />
          <Text style={styles.label}>…nebo vyhledej obec</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={search}
              placeholder="např. Tábor"
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              style={[styles.input, { flex: 1 }]}
            />
            <Button title="Hledat" variant="secondary" onPress={search} />
          </View>
          {places.map((p) => (
            <Pressable
              key={`${p.lat},${p.lon}`}
              onPress={() => {
                updateGarden({ location: { lat: p.lat, lon: p.lon, label: p.name } });
                setPlaces([]);
                setQuery('');
              }}
              style={styles.place}
            >
              <Text style={{ fontWeight: '600', color: colors.text }}>{p.name}</Text>
              <Muted>{p.region}</Muted>
            </Pressable>
          ))}
        </Card>

        {canNotify && <SectionTitle>Denní připomínka</SectionTitle>}
        {canNotify && <Card>
          <View style={styles.switchRow}>
            <Text style={{ fontSize: 16, color: colors.text, flex: 1 }}>Každé ráno mi připomeň péči o zahradu</Text>
            <Switch value={settings.notifyEnabled} onValueChange={toggleNotify} trackColor={{ true: colors.primary }} />
          </View>
          {settings.notifyEnabled && (
            <View style={[styles.wrapRow, { marginTop: 8 }]}>
              {[6, 7, 8, 9, 18, 19].map((h) => (
                <Chip key={h} label={`${h}:00`} selected={settings.notifyHour === h} onPress={() => updateSettings({ notifyHour: h })} />
              ))}
            </View>
          )}
        </Card>}

        <SectionTitle>Poradna s fotkou (AI)</SectionTitle>
        <Card>
          <Muted>
            Rozpoznání problémů z fotky používá umělou inteligenci Claude. Vlož svůj API klíč z console.anthropic.com – zůstane
            uložený jen v tomto telefonu.
          </Muted>
          <TextInput
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="sk-ant-…"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={[styles.input, { marginTop: 12 }]}
          />
          <Button
            title="Uložit klíč"
            variant="secondary"
            onPress={() => {
              updateSettings({ apiKey: apiKey.trim() });
              notify('Uloženo', apiKey.trim() ? 'API klíč je uložen.' : 'API klíč byl odstraněn.');
            }}
            style={{ marginTop: 8 }}
          />
        </Card>

        <Muted style={{ textAlign: 'center', marginTop: 8 }}>Počasí: Open-Meteo.com · Zahradník 1.0</Muted>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 60 },
  label: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  current: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  place: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap' },
});
