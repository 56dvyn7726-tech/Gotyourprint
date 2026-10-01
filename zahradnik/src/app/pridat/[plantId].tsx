import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { parseNumber, PlacementForm, PlacementValues } from '../../components/PlacementForm';
import { Button, colors, font, Pill, T } from '../../components/ui';
import { CATEGORY_TINT } from '../../data/categories';
import { getPlant } from '../../data/plants';
import { useStore } from '../../lib/store';

export default function AddPlantScreen() {
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const plant = getPlant(plantId);
  const { garden, addPlant } = useStore();

  const defaultArea = plant?.rootDepth === 'hluboké' && plant.perennial ? '4' : plant?.category === 'trávník' ? '50' : '1';
  const [values, setValues] = useState<PlacementValues>({
    placement: 'záhon',
    sun: plant?.sun ?? 'slunce',
    area: defaultArea,
    count: '1',
    note: '',
  });

  if (!plant) return <T v="body" style={{ padding: 16 }}>Rostlina nenalezena.</T>;

  const save = (placeOnMap: boolean) => {
    const uid = addPlant({
      plantId: plant.id,
      placement: values.placement,
      sun: values.sun,
      areaM2: parseNumber(values.area, 1),
      count: Math.round(parseNumber(values.count, 1)),
      note: values.note.trim() || undefined,
    });
    if (placeOnMap) router.dismissTo({ pathname: '/plan', params: { place: uid } });
    else router.dismissTo('/zahrada');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: plant.name }} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown} style={[styles.hero, { backgroundColor: CATEGORY_TINT[plant.category] }]}>
          <Text style={{ fontSize: 72 }}>{plant.emoji}</Text>
          <T v="h1" style={{ marginTop: 6 }}>
            {plant.name}
          </T>
          <T v="small" style={{ fontStyle: 'italic' }}>
            {plant.latin}
          </T>
          <View style={styles.pills}>
            <Pill label={plant.sun} icon="sunny" color="#9A5A06" bg="rgba(255,255,255,0.75)" />
            <Pill
              label={plant.frostLimit > 0 ? `nesnáší pod ${plant.frostLimit} °C` : `mráz do ${plant.frostLimit} °C`}
              icon="snow"
              color="#2F5FB8"
              bg="rgba(255,255,255,0.75)"
            />
            <Pill label={`kořeny ${plant.rootDepth}`} icon="git-branch" color={colors.primary} bg="rgba(255,255,255,0.75)" />
          </View>
        </Animated.View>

        <View style={styles.water}>
          <Ionicons name="water" size={20} color={colors.water} />
          <Text style={styles.waterText}>{plant.watering}</Text>
        </View>

        <PlacementForm values={values} onChange={setValues} />

        {garden.location ? (
          <>
            <Button title="Přidat a označit na mapě" icon="location" onPress={() => save(true)} style={{ marginTop: 24 }} />
            <Button title="Jen přidat" variant="ghost" onPress={() => save(false)} style={{ marginTop: 10 }} />
          </>
        ) : (
          <Button title="Přidat na zahradu" icon="add" onPress={() => save(false)} style={{ marginTop: 24 }} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 60 },
  hero: { borderRadius: 28, padding: 20, alignItems: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 12 },
  water: { flexDirection: 'row', gap: 10, backgroundColor: colors.waterSoft, borderRadius: 18, padding: 14, marginTop: 12 },
  waterText: { flex: 1, ...font.medium, fontSize: 14, lineHeight: 20, color: colors.text },
});
