import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Chip, colors, Muted } from '../components/ui';
import { CATEGORIES, PLANTS } from '../data/plants';
import { Category } from '../types';

export default function CatalogScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);

  const list = useMemo(() => {
    const q = normalize(query);
    return PLANTS.filter(
      (p) =>
        (!category || p.category === category) &&
        (!q || normalize(p.name).includes(q) || normalize(p.latin).includes(q)),
    );
  }, [query, category]);

  return (
    <FlatList
      data={list}
      keyExtractor={(p) => p.id}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Hledat rostlinu…"
            placeholderTextColor={colors.muted}
            style={styles.search}
            autoCorrect={false}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <Chip label="Vše" selected={!category} onPress={() => setCategory(null)} />
            {CATEGORIES.map((c) => (
              <Chip
                key={c.key}
                label={`${c.emoji} ${c.label}`}
                selected={category === c.key}
                onPress={() => setCategory(c.key)}
              />
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={<Muted>Nic nenalezeno.</Muted>}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/pridat/${item.id}`)}>
          <Card style={styles.item}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Muted style={{ fontStyle: 'italic' }}>{item.latin}</Muted>
              <Muted>
                {item.sun} · {item.perennial ? 'vytrvalá' : 'jednoletá'} · kořeny {item.rootDepth}
              </Muted>
            </View>
            <Text style={styles.plus}>＋</Text>
          </Card>
        </Pressable>
      )}
    />
  );
}

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    color: colors.text,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 32 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  plus: { fontSize: 24, color: colors.primary },
});
