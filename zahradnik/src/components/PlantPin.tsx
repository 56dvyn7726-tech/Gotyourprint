import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from './ui';

/** Značka rostliny na mapě – emoji v kruhu, barva okraje podle dnešní potřeby vody. */
export function PlantPin({
  emoji,
  color,
  size = 40,
  selected,
  label,
}: {
  emoji: string;
  color: string;
  size?: number;
  selected?: boolean;
  label?: string;
}) {
  const s = selected ? size * 1.2 : size;
  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={[
          styles.pin,
          {
            width: s,
            height: s,
            borderRadius: s / 2,
            borderColor: color,
            borderWidth: selected ? 4 : 3,
            boxShadow: selected ? `0 0 0 4px ${color}55, 0 6px 14px rgba(0,0,0,0.35)` : '0 4px 10px rgba(0,0,0,0.35)',
          },
        ]}
      >
        <Text style={{ fontSize: s * 0.5 }}>{emoji}</Text>
      </View>
      {label && (
        <View style={styles.label}>
          <Text style={styles.labelText} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pin: { backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  label: {
    marginTop: 4,
    backgroundColor: 'rgba(18,58,41,0.9)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    maxWidth: 140,
  },
  labelText: { color: colors.white, fontFamily: fonts.bold, fontSize: 12 },
});
