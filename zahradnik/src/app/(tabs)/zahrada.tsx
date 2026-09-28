import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, colors, Muted } from '../../components/ui';
import { getPlant } from '../../data/plants';
import { useStore } from '../../lib/store';

export default function GardenScreen() {
  const { garden } = useStore();
  const usedArea = garden.plants.reduce((s, p) => s + p.areaM2, 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={styles.title}>{garden.name}</Text>
        <Muted>
          {garden.areaM2} m² · osázeno {Math.round(usedArea * 10) / 10} m² · {garden.plants.length} rostlin
        </Muted>
        <Muted>📍 {garden.location?.label ?? 'poloha nenastavena'}</Muted>
        <View style={styles.bar}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.min(100, garden.areaM2 ? (usedArea / garden.areaM2) * 100 : 0)}%` },
            ]}
          />
        </View>
      </Card>

      <Button title="＋ Přidat rostlinu" onPress={() => router.push('/katalog')} style={{ marginBottom: 12 }} />

      {garden.plants.map((gp) => {
        const plant = getPlant(gp.plantId);
        if (!plant) return null;
        return (
          <Pressable key={gp.uid} onPress={() => router.push(`/rostlina/${gp.uid}`)}>
            <Card style={styles.item}>
              <Text style={styles.emoji}>{plant.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {plant.name}
                  {gp.count > 1 ? ` × ${gp.count}` : ''}
                </Text>
                <Muted>
                  {gp.note ? `${gp.note} · ` : ''}
                  {gp.placement} · {gp.sun} · {gp.areaM2} m²
                </Muted>
                {gp.lastWatered && <Muted>💧 naposledy zalito {formatShort(gp.lastWatered)}</Muted>}
              </View>
              <Text style={styles.chevron}>›</Text>
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function formatShort(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}. ${m}. ${y}`;
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  bar: { height: 8, backgroundColor: colors.bg, borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.primary },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 34 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  chevron: { fontSize: 28, color: colors.muted },
});
