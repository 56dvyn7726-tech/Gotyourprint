import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Placement, Sun } from '../types';
import { Chip, colors, Muted } from './ui';

export interface PlacementValues {
  placement: Placement;
  sun: Sun;
  area: string;
  count: string;
  note: string;
}

const PLACEMENTS: { key: Placement; label: string }[] = [
  { key: 'záhon', label: '🌾 Záhon / volná půda' },
  { key: 'květináč', label: '🪴 Květináč / truhlík' },
  { key: 'skleník', label: '🏠 Skleník / fóliovník' },
];

const SUNS: { key: Sun; label: string }[] = [
  { key: 'slunce', label: '☀️ Slunce' },
  { key: 'polostín', label: '⛅ Polostín' },
  { key: 'stín', label: '🌥️ Stín' },
];

export function PlacementForm({
  values,
  onChange,
}: {
  values: PlacementValues;
  onChange: (v: PlacementValues) => void;
}) {
  const set = (patch: Partial<PlacementValues>) => onChange({ ...values, ...patch });
  return (
    <View>
      <Text style={styles.label}>Kde roste?</Text>
      <View style={styles.wrap}>
        {PLACEMENTS.map((p) => (
          <Chip key={p.key} label={p.label} selected={values.placement === p.key} onPress={() => set({ placement: p.key })} />
        ))}
      </View>

      <Text style={styles.label}>Kolik má slunce?</Text>
      <View style={styles.wrap}>
        {SUNS.map((s) => (
          <Chip key={s.key} label={s.label} selected={values.sun === s.key} onPress={() => set({ sun: s.key })} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Plocha (m²)</Text>
          <TextInput
            value={values.area}
            onChangeText={(t) => set({ area: t })}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Počet kusů</Text>
          <TextInput
            value={values.count}
            onChangeText={(t) => set({ count: t })}
            keyboardType="number-pad"
            style={styles.input}
          />
        </View>
      </View>
      <Muted>Plocha slouží k výpočtu litrů vody (1 mm srážek = 1 l na m²).</Muted>

      <Text style={styles.label}>Poznámka (volitelné)</Text>
      <TextInput
        value={values.note}
        onChangeText={(t) => set({ note: t })}
        placeholder="např. záhon u plotu, odrůda Cherry…"
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
    </View>
  );
}

export function parseNumber(s: string, fallback: number): number {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const styles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 14, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
});
