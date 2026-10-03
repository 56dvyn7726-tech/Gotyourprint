import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar, Chip, colors, font, haptic, Input, T } from '../components/ui';
import { CATEGORY_TINT } from '../data/categories';
import { CATEGORIES, PLANTS } from '../data/plants';
import { useStore } from '../lib/store';
import { Category } from '../types';

const SUN_ICON = { slunce: 'sunny', polostín: 'partly-sunny', stín: 'cloudy' } as const;

export default function CatalogScreen() {
  const { garden } = useStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const owned = new Set(garden.plants.map((p) => p.plantId));

  const list = useMemo(() => {
    const q = normalize(query);
    return PLANTS.filter(
      (p) => (!category || p.category === category) && (!q || normalize(p.name).includes(q) || normalize(p.latin).includes(q)),
    );
  }, [query, category]);

  return (
    <FlatList
      data={list}
      keyExtractor={(p) => p.id}
      numColumns={2}
      contentContainerStyle={styles.container}
      columnWrapperStyle={{ gap: 12 }}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ marginBottom: 8 }}>
          <Input icon="search" value={query} onChangeText={setQuery} placeholder="Hledat rostlinu…" autoCorrect={false} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            <Chip label="Vše" selected={!category} onPress={() => setCategory(null)} />
            {CATEGORIES.map((c) => (
              <Chip key={c.key} label={`${c.emoji} ${c.label}`} selected={category === c.key} onPress={() => setCategory(c.key)} />
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={<T v="body" color={colors.muted}>Nic nenalezeno.</T>}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => {
            haptic();
            router.push(`/pridat/${item.id}`);
          }}
          style={({ pressed }) => [styles.tile, pressed && { transform: [{ scale: 0.97 }] }]}
        >
          <View style={[styles.art, { backgroundColor: CATEGORY_TINT[item.category] }]}>
            <Text style={{ fontSize: 48 }}>{item.emoji}</Text>
            {owned.has(item.id) && (
              <View style={styles.owned}>
                <Ionicons name="checkmark" size={12} color={colors.white} />
              </View>
            )}
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.latin} numberOfLines={1}>
            {item.latin}
          </Text>
          <View style={styles.tags}>
            <Ionicons name={SUN_ICON[item.sun]} size={13} color={colors.sun} />
            <Text style={styles.tag}>{item.sun}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.tag}>{item.perennial ? 'trvalka' : 'jednoletá'}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, gap: 12 },
  tile: { flex: 1, backgroundColor: colors.surface, borderRadius: 24, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', boxShadow: '0 4px 16px rgba(20,60,40,0.07)', maxWidth: '50%' },
  art: { height: 96, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  owned: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...font.bold, fontSize: 15, color: colors.text, marginTop: 10, paddingHorizontal: 4 },
  latin: { ...font.medium, fontSize: 12, color: colors.muted, fontStyle: 'italic', paddingHorizontal: 4 },
  tags: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingHorizontal: 4, paddingBottom: 4 },
  tag: { ...font.semibold, fontSize: 11, color: colors.muted },
  dot: { color: colors.faint },
});
