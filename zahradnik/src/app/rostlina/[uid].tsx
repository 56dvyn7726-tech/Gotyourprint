import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { parseNumber, PlacementForm, PlacementValues } from '../../components/PlacementForm';
import { Banner, Button, Card, colors, Muted, SectionTitle } from '../../components/ui';
import { getPlant } from '../../data/plants';
import { adviseForPlant } from '../../lib/advice';
import { isoDate, MONTH_NAMES } from '../../lib/season';
import { useStore } from '../../lib/store';

export default function PlantDetailScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { garden, weather, updatePlant, removePlant } = useStore();
  const gp = garden.plants.find((p) => p.uid === uid);
  const plant = gp ? getPlant(gp.plantId) : undefined;
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<PlacementValues | null>(null);

  if (!gp || !plant) {
    return (
      <View style={styles.container}>
        <Muted>Rostlina už na zahradě není.</Muted>
      </View>
    );
  }

  const advice = weather ? adviseForPlant(gp, weather, new Date()) : null;
  const month = new Date().getMonth() + 1;

  const startEdit = () => {
    setValues({
      placement: gp.placement,
      sun: gp.sun,
      area: String(gp.areaM2),
      count: String(gp.count),
      note: gp.note ?? '',
    });
    setEditing(true);
  };

  const saveEdit = () => {
    if (!values) return;
    updatePlant(gp.uid, {
      placement: values.placement,
      sun: values.sun,
      areaM2: parseNumber(values.area, gp.areaM2),
      count: Math.round(parseNumber(values.count, gp.count)),
      note: values.note.trim() || undefined,
    });
    setEditing(false);
  };

  const remove = () =>
    Alert.alert('Odebrat rostlinu?', `${plant.name} bude odebrána ze zahrady.`, [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Odebrat',
        style: 'destructive',
        onPress: () => {
          removePlant(gp.uid);
          router.back();
        },
      },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: plant.name }} />
      <Card>
        <Text style={styles.title}>
          {plant.emoji} {plant.name}
        </Text>
        <Muted style={{ fontStyle: 'italic' }}>{plant.latin}</Muted>
        <Muted>
          {gp.placement} · {gp.sun} · {gp.areaM2} m² · {gp.count} ks{gp.note ? ` · ${gp.note}` : ''}
        </Muted>
        {advice && (
          <Banner tone={advice.verdict === 'zalij' ? 'water' : advice.verdict === 'zkontroluj' ? 'warn' : 'ok'}>
            {advice.headline}
            {'\n'}
            {advice.reason}
          </Banner>
        )}
        {advice?.warnings.map((w) => (
          <Banner key={w}>{w}</Banner>
        ))}
        <View style={styles.buttons}>
          <Button
            title="Zalito ✓"
            onPress={() => updatePlant(gp.uid, { lastWatered: isoDate(new Date()), lastWateredMm: advice?.mm || 10 })}
            style={{ flex: 1 }}
          />
          <Button
            title="📷 Problém?"
            variant="secondary"
            onPress={() => router.push({ pathname: '/diagnoza', params: { plantId: plant.id } })}
            style={{ flex: 1 }}
          />
        </View>
        {gp.lastWatered && <Muted style={{ marginTop: 8 }}>Naposledy zalito: {gp.lastWatered}</Muted>}
      </Card>

      <SectionTitle>Zálivka</SectionTitle>
      <Card>
        <Text style={styles.body}>{plant.watering}</Text>
      </Card>

      <SectionTitle>Kalendář péče</SectionTitle>
      <Card>
        {Array.from({ length: 12 }, (_, i) => i + 1)
          .filter((m) => plant.tasks[m])
          .map((m) => (
            <View key={m} style={[styles.monthRow, m === month && styles.monthNow]}>
              <Text style={[styles.monthName, m === month && { color: colors.primaryDark }]}>{MONTH_NAMES[m - 1]}</Text>
              <Text style={styles.monthTask}>{plant.tasks[m]}</Text>
            </View>
          ))}
      </Card>

      <SectionTitle>Tipy a triky</SectionTitle>
      <Card>
        {plant.tips.map((t) => (
          <Text key={t} style={styles.bullet}>
            💡 {t}
          </Text>
        ))}
      </Card>

      <SectionTitle>Zajímavosti</SectionTitle>
      <Card>
        {plant.facts.map((t) => (
          <Text key={t} style={styles.bullet}>
            🧠 {t}
          </Text>
        ))}
      </Card>

      <SectionTitle>Umístění</SectionTitle>
      {editing && values ? (
        <>
          <PlacementForm values={values} onChange={setValues} />
          <Button title="Uložit" onPress={saveEdit} style={{ marginTop: 16 }} />
        </>
      ) : (
        <Button title="Upravit umístění a plochu" variant="secondary" onPress={startEdit} />
      )}
      <Button title="Odebrat ze zahrady" variant="danger" onPress={remove} style={{ marginTop: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  bullet: { fontSize: 15, lineHeight: 22, color: colors.text, marginBottom: 8 },
  monthRow: { flexDirection: 'row', paddingVertical: 6, gap: 10, borderRadius: 8, paddingHorizontal: 6 },
  monthNow: { backgroundColor: colors.primarySoft },
  monthName: { width: 76, fontWeight: '700', color: colors.muted },
  monthTask: { flex: 1, color: colors.text, lineHeight: 20 },
});
