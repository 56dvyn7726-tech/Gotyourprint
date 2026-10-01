import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseNumber, PlacementForm, PlacementValues } from '../components/PlacementForm';
import { PlantPin } from '../components/PlantPin';
import { SatelliteMap } from '../components/SatelliteMap';
import { Banner, Button, Card, colors, font, haptic, IconButton, SectionHeader, T } from '../components/ui';
import { getPlant } from '../data/plants';
import { confirmAsk } from '../lib/dialog';
import { centroid, formatArea, polygonArea } from '../lib/geo';
import { isoDate, MONTH_NAMES } from '../lib/season';
import { useStore } from '../lib/store';
import { useAdvice, VERDICT } from '../lib/verdict';

const SHORT_MONTHS = ['led', 'úno', 'bře', 'dub', 'kvě', 'čvn', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'];

export default function PlantDetailScreen() {
  const insets = useSafeAreaInsets();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { garden, updatePlant, removePlant } = useStore();
  const { byUid } = useAdvice();
  const gp = garden.plants.find((p) => p.uid === uid);
  const plant = gp ? getPlant(gp.plantId) : undefined;
  const thisMonth = new Date().getMonth() + 1;
  const [month, setMonth] = useState(thisMonth);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<PlacementValues | null>(null);

  if (!gp || !plant) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <T v="body">Rostlina už na zahradě není.</T>
      </View>
    );
  }

  const advice = byUid[gp.uid];
  const v = VERDICT[advice?.verdict ?? 'nezalévej'];
  const at = gp.pos ?? (gp.shape ? centroid(gp.shape) : undefined);

  const water = () => {
    haptic('success');
    updatePlant(gp.uid, { lastWatered: isoDate(new Date()), lastWateredMm: advice?.mm || 10 });
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

  const remove = async () => {
    if (!(await confirmAsk('Odebrat rostlinu?', `${plant.name} bude odebrána ze zahrady.`, 'Odebrat', true))) return;
    removePlant(gp.uid);
    if (router.canGoBack()) router.back();
    else router.replace('/zahrada');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={[styles.hero, { paddingTop: insets.top + 40 }]}>
          <Animated.View entering={FadeInDown} style={{ alignItems: 'center' }}>
            <View style={[styles.bigAvatar, { borderColor: v.color }]}>
              <Text style={{ fontSize: 64 }}>{plant.emoji}</Text>
            </View>
            <T v="largeTitle" style={{ marginTop: 14 }}>
              {plant.name}
            </T>
            <T v="small" style={{ fontStyle: 'italic' }}>
              {plant.latin}
              {gp.note ? ` · ${gp.note}` : ''}
            </T>
            <View style={styles.heroPills}>
              <HeroPill icon="grid" text={gp.shape ? formatArea(polygonArea(gp.shape)) : `${gp.areaM2} m²`} />
              <HeroPill icon="leaf" text={`${gp.count} ks`} />
              <HeroPill icon="sunny" text={gp.sun} />
              <HeroPill icon="home" text={gp.placement} />
            </View>
          </Animated.View>
        </View>

        <View style={styles.body}>
          <Animated.View entering={FadeInDown.delay(80)}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.verdictIcon, { backgroundColor: v.soft }]}>
                  <Ionicons name={v.icon} size={22} color={v.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <T v="caption" color={v.color}>
                    Dnes
                  </T>
                  <T v="h3">{advice?.headline ?? 'Čekám na počasí…'}</T>
                </View>
              </View>
              {advice && (
                <T v="small" color={colors.text} style={{ marginTop: 10 }}>
                  {advice.reason}
                </T>
              )}
              {advice?.warnings.map((w) => (
                <Banner key={w} tone={w.startsWith('🥶') ? 'frost' : 'sun'}>
                  {w.replace(/^\S+\s/, '')}
                </Banner>
              ))}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <Button title="Zalito" icon="water" onPress={water} style={{ flex: 1 }} small />
                <Button
                  title="Má problém"
                  icon="camera"
                  variant="soft"
                  small
                  onPress={() => router.push({ pathname: '/diagnoza', params: { plantId: plant.id } })}
                  style={{ flex: 1 }}
                />
              </View>
              {gp.lastWatered && (
                <T v="small" style={{ marginTop: 10, textAlign: 'center' }}>
                  Naposledy zalito {formatIso(gp.lastWatered)}
                </T>
              )}
            </Card>
          </Animated.View>

          <SectionHeader title="Na zahradě" action={at ? 'Upravit' : undefined} onAction={() => router.push('/plan')} />
          {at ? (
            <View style={styles.map}>
              <SatelliteMap
                view={{ center: at, zoom: gp.shape ? 20 : 19.5 }}
                onViewChange={() => {}}
                style={StyleSheet.absoluteFill}
                polygons={gp.shape ? [{ id: 'bed', points: gp.shape, fill: `${v.color}44`, stroke: v.color, width: 2.5 }] : []}
                markers={[{ id: 'p', at, width: 44, height: 44, anchor: 'center', node: <PlantPin emoji={plant.emoji} color={v.color} /> }]}
              />
              <Pressable style={StyleSheet.absoluteFill} onPress={() => router.push('/plan')} accessibilityLabel="Otevřít plán zahrady" />
            </View>
          ) : (
            <Card
              onPress={() => (garden.location ? router.push({ pathname: '/plan', params: { place: gp.uid } }) : router.push('/poloha'))}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[styles.verdictIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="location" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <T v="h3">Označ ji na mapě</T>
                  <T v="small">Uvidíš ji na satelitním plánu zahrady.</T>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.faint} />
              </View>
            </Card>
          )}

          <SectionHeader title="Kalendář péče" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
            {SHORT_MONTHS.map((m, i) => {
              const n = i + 1;
              const has = !!plant.tasks[n];
              const active = plant.activeMonths.includes(n);
              const on = n === month;
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    haptic();
                    setMonth(n);
                  }}
                  style={[styles.month, active && styles.monthActive, on && styles.monthOn]}
                >
                  <Text style={[styles.monthText, on && { color: colors.white }]}>{m}</Text>
                  <View style={[styles.monthDot, { backgroundColor: has ? (on ? colors.white : colors.primaryBright) : 'transparent' }]} />
                  {n === thisMonth && <Text style={[styles.now, on && { color: colors.white }]}>teď</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
          <Animated.View key={month} entering={FadeIn.duration(200)}>
            <Card style={{ marginTop: 10 }}>
              <T v="caption" color={colors.primaryBright}>
                {MONTH_NAMES[month - 1]}
              </T>
              <T v="body" style={{ marginTop: 4 }}>
                {plant.tasks[month] ??
                  (plant.activeMonths.includes(month)
                    ? 'Pravidelná péče – zálivka podle počasí a pletí.'
                    : 'Klidové období, rostlina nepotřebuje žádnou zvláštní péči.')}
              </T>
            </Card>
          </Animated.View>

          <SectionHeader title="Jak zalévat" />
          <Card style={{ backgroundColor: colors.waterSoft }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Ionicons name="water" size={22} color={colors.water} />
              <T v="body" style={{ flex: 1 }}>
                {plant.watering}
              </T>
            </View>
          </Card>

          <SectionHeader title="Tipy a triky" />
          {plant.tips.map((t) => (
            <Card key={t}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Ionicons name="bulb" size={20} color={colors.sun} />
                <T v="body" style={{ flex: 1 }}>
                  {t}
                </T>
              </View>
            </Card>
          ))}

          <SectionHeader title="Zajímavosti" />
          {plant.facts.map((t) => (
            <Card key={t} style={{ backgroundColor: colors.purpleSoft }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Ionicons name="sparkles" size={20} color="#7A45A0" />
                <T v="body" style={{ flex: 1 }}>
                  {t}
                </T>
              </View>
            </Card>
          ))}

          <SectionHeader title="Nastavení rostliny" />
          {editing && values ? (
            <>
              <PlacementForm values={values} onChange={setValues} />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
                <Button title="Zrušit" variant="ghost" onPress={() => setEditing(false)} style={{ flex: 1 }} />
                <Button title="Uložit" icon="checkmark" onPress={saveEdit} style={{ flex: 1 }} />
              </View>
            </>
          ) : (
            <Button
              title="Upravit umístění a plochu"
              icon="options"
              variant="soft"
              onPress={() => {
                setValues({ placement: gp.placement, sun: gp.sun, area: String(gp.areaM2), count: String(gp.count), note: gp.note ?? '' });
                setEditing(true);
              }}
            />
          )}
          <Button title="Odebrat ze zahrady" icon="trash" variant="danger" onPress={remove} style={{ marginTop: 12 }} />
        </View>
      </ScrollView>
      <IconButton
        icon="arrow-back"
        tone="glass"
        label="Zpět"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/zahrada'))}
        style={{ position: 'absolute', top: insets.top + 10, left: 12 }}
      />
    </View>
  );
}

function formatIso(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}. ${m}. ${y}`;
}

function HeroPill({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={styles.heroPill}>
      <Ionicons name={icon} size={13} color={colors.primary} />
      <Text style={styles.heroPillText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 18 },
  bigAvatar: {
    width: 116,
    height: 116,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    boxShadow: '0 16px 40px rgba(20,60,40,0.18)',
  },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 14 },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  heroPillText: { color: colors.text, ...font.medium, fontSize: 13 },
  body: { paddingHorizontal: 16 },
  verdictIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  map: { height: 180, borderRadius: 24, overflow: 'hidden', marginBottom: 12, backgroundColor: '#243328' },
  month: {
    width: 52,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    gap: 4,
  },
  monthActive: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  monthOn: { backgroundColor: colors.primaryBright, borderColor: colors.primaryBright },
  monthText: { ...font.bold, fontSize: 13, color: colors.text },
  monthDot: { width: 6, height: 6, borderRadius: 3 },
  now: { ...font.bold, fontSize: 9, color: colors.primaryBright, textTransform: 'uppercase' },
});
