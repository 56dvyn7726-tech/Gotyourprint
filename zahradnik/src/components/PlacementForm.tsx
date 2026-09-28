import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Placement, Sun } from '../types';
import { colors, fonts, haptic, IconName, Input, T } from './ui';

export interface PlacementValues {
  placement: Placement;
  sun: Sun;
  area: string;
  count: string;
  note: string;
}

const PLACEMENTS: { key: Placement; label: string; icon: IconName }[] = [
  { key: 'záhon', label: 'Záhon', icon: 'leaf' },
  { key: 'květináč', label: 'Květináč', icon: 'flower' },
  { key: 'skleník', label: 'Skleník', icon: 'home' },
];

const SUNS: { key: Sun; label: string; icon: IconName }[] = [
  { key: 'slunce', label: 'Slunce', icon: 'sunny' },
  { key: 'polostín', label: 'Polostín', icon: 'partly-sunny' },
  { key: 'stín', label: 'Stín', icon: 'cloudy' },
];

function Tiles<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string; icon: IconName }[];
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <View style={styles.tiles}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              haptic();
              onChange(o.key);
            }}
            style={[styles.tile, on && styles.tileOn]}
          >
            <Ionicons name={o.icon} size={24} color={on ? colors.white : colors.primary} />
            <Text style={[styles.tileText, on && { color: colors.white }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Stepper({ label, value, onChange, step, unit }: { label: string; value: string; onChange: (v: string) => void; step: number; unit: string }) {
  const n = parseNumber(value, 0);
  const set = (x: number) => {
    haptic();
    onChange(String(Math.max(step, Math.round(x * 10) / 10)).replace('.', ','));
  };
  return (
    <View style={styles.stepper}>
      <T v="caption">{label}</T>
      <View style={styles.stepRow}>
        <Pressable onPress={() => set(n - step)} style={styles.stepBtn} accessibilityLabel={`Méně – ${label}`}>
          <Ionicons name="remove" size={20} color={colors.primary} />
        </Pressable>
        <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" style={styles.stepInput} selectTextOnFocus />
        <Pressable onPress={() => set(n + step)} style={styles.stepBtn} accessibilityLabel={`Více – ${label}`}>
          <Ionicons name="add" size={20} color={colors.primary} />
        </Pressable>
      </View>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

export function PlacementForm({ values, onChange }: { values: PlacementValues; onChange: (v: PlacementValues) => void }) {
  const set = (patch: Partial<PlacementValues>) => onChange({ ...values, ...patch });
  return (
    <View>
      <T v="h3" style={styles.label}>
        Kde roste?
      </T>
      <Tiles options={PLACEMENTS} value={values.placement} onChange={(placement) => set({ placement })} />

      <T v="h3" style={styles.label}>
        Kolik má slunce?
      </T>
      <Tiles options={SUNS} value={values.sun} onChange={(sun) => set({ sun })} />

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <Stepper label="Plocha" value={values.area} onChange={(area) => set({ area })} step={0.5} unit="m²" />
        <Stepper label="Počet" value={values.count} onChange={(count) => set({ count })} step={1} unit="ks" />
      </View>
      <T v="small" style={{ marginTop: 8 }}>
        Plochu záhonu můžeš i obkreslit na plánu zahrady – spočítá se sama.
      </T>

      <T v="h3" style={styles.label}>
        Poznámka
      </T>
      <Input icon="create-outline" value={values.note} onChangeText={(note) => set({ note })} placeholder="např. u plotu, odrůda Cherry…" />
    </View>
  );
}

export function parseNumber(s: string, fallback: number): number {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const styles = StyleSheet.create({
  label: { marginTop: 20, marginBottom: 10 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tileOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  tileText: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  stepper: { flex: 1, backgroundColor: colors.surface, borderRadius: 20, padding: 12, borderWidth: 1.5, borderColor: colors.border },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  stepBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepInput: { flex: 1, minWidth: 0, textAlign: 'center', fontFamily: fonts.extrabold, fontSize: 20, color: colors.text, paddingVertical: 4 },
  unit: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 2 },
});
