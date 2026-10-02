import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Card, Chip, colors, fonts, haptic, IconButton, T, TAB_BAR_SPACE } from '../../components/ui';
import { CATEGORY_TINT } from '../../data/categories';
import { CATEGORIES, getPlant } from '../../data/plants';
import { formatArea, polygonArea } from '../../lib/geo';
import { useStore } from '../../lib/store';
import { useAdvice, VERDICT } from '../../lib/verdict';
import { plural } from '../../lib/weatherIcon';
import { Category } from '../../types';

type Filter = 'vse' | 'voda' | Category;

export default function GardenScreen() {
  const insets = useSafeAreaInsets();
  const { garden } = useStore();
  const { byUid } = useAdvice();
  const [filter, setFilter] = useState<Filter>('vse');

  const area = garden.outline ? polygonArea(garden.outline) : garden.areaM2;
  const planted = garden.plants.reduce((s, p) => s + p.areaM2, 0);
  const onMap = garden.plants.filter((p) => p.pos || p.shape).length;
  const thirsty = garden.plants.filter((p) => byUid[p.uid]?.verdict === 'zalij').length;
  const presentCats = CATEGORIES.filter((c) => garden.plants.some((p) => getPlant(p.plantId)?.category === c.key));

  const list = garden.plants.filter((p) => {
    if (filter === 'vse') return true;
    if (filter === 'voda') return byUid[p.uid]?.verdict === 'zalij' || byUid[p.uid]?.verdict === 'zkontroluj';
    return getPlant(p.plantId)?.category === filter;
  });

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <T v="h1">Moje rostliny</T>
          <T v="small">{garden.name}</T>
        </View>
        <IconButton icon="add" tone="primary" onPress={() => router.push('/katalog')} label="Přidat rostlinu" />
      </View>

      <View style={styles.stats}>
        <StatTile icon="resize" value={formatArea(area)} label={garden.outline ? 'z mapy' : 'rozloha'} tint={colors.primarySoft} color={colors.primary} />
        <StatTile icon="leaf" value={`${garden.plants.length}`} label={plural(garden.plants.length, 'rostlina', 'rostliny', 'rostlin')} tint="#EFE2F6" color="#7A45A0" />
        <StatTile icon="water" value={`${thirsty}`} label="zalít dnes" tint={colors.waterSoft} color={colors.water} />
      </View>

      {garden.plants.length > 0 && (
        <Card onPress={() => router.push('/plan')} style={styles.mapRow}>
          <View style={[styles.mapIcon]}>
            <Ionicons name="map" size={20} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="h3">Plán zahrady</T>
            <T v="small">
              Na mapě {onMap} z {garden.plants.length} · osázeno {formatArea(planted)}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.faint} />
        </Card>
      )}

      {garden.plants.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginBottom: 8, flexGrow: 0 }}>
          <Chip label="Vše" selected={filter === 'vse'} onPress={() => setFilter('vse')} />
          <Chip label="Potřebují vodu" icon="water" selected={filter === 'voda'} onPress={() => setFilter('voda')} />
          {presentCats.map((c) => (
            <Chip key={c.key} label={`${c.emoji} ${c.label}`} selected={filter === c.key} onPress={() => setFilter(c.key)} />
          ))}
        </ScrollView>
      )}

      {garden.plants.length === 0 ? (
        <Card onPress={() => router.push('/katalog')} style={{ alignItems: 'center', paddingVertical: 32 }}>
          <Text style={{ fontSize: 56 }}>🌱</Text>
          <T v="h2" style={{ marginTop: 8 }}>
            Zatím tu nic neroste
          </T>
          <T v="body" color={colors.muted} style={{ textAlign: 'center', marginTop: 4 }}>
            Vyber z katalogu, co máš na zahradě.
          </T>
        </Card>
      ) : (
        <View style={styles.grid}>
          {list.map((gp, i) => {
            const plant = getPlant(gp.plantId);
            if (!plant) return null;
            const v = VERDICT[byUid[gp.uid]?.verdict ?? 'nezalévej'];
            return (
              <Animated.View key={gp.uid} entering={FadeInDown.delay(i * 40)} style={styles.cell}>
                <Pressable
                  onPress={() => {
                    haptic();
                    router.push({ pathname: '/rostlina', params: { uid: gp.uid } });
                  }}
                  style={({ pressed }) => [styles.tile, pressed && { transform: [{ scale: 0.97 }] }]}
                >
                  <View style={styles.tileTop}>
                    <Avatar emoji={plant.emoji} bg={CATEGORY_TINT[plant.category]} size={56} />
                    {(gp.pos || gp.shape) && <Ionicons name="location" size={16} color={colors.primaryBright} />}
                  </View>
                  <Text style={styles.tileName} numberOfLines={1}>
                    {plant.name}
                    {gp.count > 1 ? ` ×${gp.count}` : ''}
                  </Text>
                  <Text style={styles.tileNote} numberOfLines={1}>
                    {gp.note ?? `${gp.placement} · ${gp.areaM2} m²`}
                  </Text>
                  <View style={[styles.status, { backgroundColor: v.soft }]}>
                    <Ionicons name={v.icon} size={13} color={v.color} />
                    <Text style={[styles.statusText, { color: v.color }]}>{v.label}</Text>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function StatTile({ icon, value, label, tint, color }: { icon: React.ComponentProps<typeof Ionicons>['name']; value: string; label: string; tint: string; color: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: tint }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: TAB_BAR_SPACE },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  stat: { flex: 1, borderRadius: 20, padding: 14, gap: 2 },
  statValue: { fontFamily: fonts.extrabold, fontSize: 20, marginTop: 6 },
  statLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mapIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  cell: { width: '50%', padding: 6 },
  tile: { backgroundColor: colors.surface, borderRadius: 24, padding: 14, boxShadow: '0 2px 8px rgba(18, 58, 41, 0.06)' },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tileName: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, marginTop: 10 },
  tileNote: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 1 },
  status: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginTop: 10 },
  statusText: { fontFamily: fonts.bold, fontSize: 11 },
});
