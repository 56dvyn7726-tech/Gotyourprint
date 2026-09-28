import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { parseNumber, PlacementForm, PlacementValues } from '../../components/PlacementForm';
import { Button, Card, colors, Muted } from '../../components/ui';
import { getPlant } from '../../data/plants';
import { useStore } from '../../lib/store';

export default function AddPlantScreen() {
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const plant = getPlant(plantId);
  const { addPlant } = useStore();

  const defaultArea = plant?.rootDepth === 'hluboké' && plant.perennial ? '4' : plant?.category === 'trávník' ? '50' : '1';
  const [values, setValues] = useState<PlacementValues>({
    placement: 'záhon',
    sun: plant?.sun ?? 'slunce',
    area: defaultArea,
    count: '1',
    note: '',
  });

  if (!plant) return <Muted>Rostlina nenalezena.</Muted>;

  const save = () => {
    addPlant({
      plantId: plant.id,
      placement: values.placement,
      sun: values.sun,
      areaM2: parseNumber(values.area, 1),
      count: Math.round(parseNumber(values.count, 1)),
      note: values.note.trim() || undefined,
    });
    router.dismissTo('/zahrada');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.title}>
            {plant.emoji} {plant.name}
          </Text>
          <Muted style={{ fontStyle: 'italic' }}>{plant.latin}</Muted>
          <Text style={styles.body}>💧 {plant.watering}</Text>
          <Muted>
            Nejlépe se jí daří na stanovišti: {plant.sun}.{' '}
            {plant.frostLimit > 0
              ? `Nesnáší teploty pod ${plant.frostLimit} °C.`
              : `Odolá mrazu do ${plant.frostLimit} °C.`}
          </Muted>
        </Card>
        <PlacementForm values={values} onChange={setValues} />
        <Button title="Přidat na zahradu" onPress={save} style={{ marginTop: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.text, marginVertical: 8 },
});
