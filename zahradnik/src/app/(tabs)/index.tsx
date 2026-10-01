import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { GardenMapPreview } from '../../components/GardenMapPreview';
import {
  Avatar,
  Banner,
  Button,
  Card,
  colors,
  Glass,
  shadow,
  font,
  haptic,
  Pill,
  SectionHeader,
  T,
  TAB_BAR_SPACE,
} from '../../components/ui';
import { dailyTipAndFact, daysSinceRain, PlantAdvice } from '../../lib/advice';
import { daysToNextSeason, formatDateCz, getSeason, isoDate, MONTH_TASKS } from '../../lib/season';
import { useStore } from '../../lib/store';
import { useAdvice, VERDICT } from '../../lib/verdict';
import { describeWeather } from '../../lib/weather';
import { dayNumber, fmt1, greeting, plural, shortDay, weatherIcon } from '../../lib/weatherIcon';
import { DayWeather } from '../../types';

/** Barvy oblohy pro widget s počasím (jako aplikace Počasí v iPhonu). */
function skyColors(code?: number): [string, string, string] {
  if (code === undefined) return ['#3E8E6A', '#5FB487', '#8DD3A8'];
  if (code <= 1) return ['#2F7BD8', '#4FA3EE', '#86C9F7'];
  if (code <= 3) return ['#5B7FA6', '#7E9DBF', '#A9C0D8'];
  if (code >= 95) return ['#38405A', '#555F7C', '#7A84A0'];
  return ['#4A6283', '#6B84A3', '#93A9C2'];
}

const SEASON_ICON = { jaro: '🌱', léto: '☀️', podzim: '🍂', zima: '❄️' } as const;

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const { garden, weather, weatherError, weatherLoading, refreshWeather, updatePlant } = useStore();
  const { list: advice } = useAdvice();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [day, setDay] = useState(0);
  const now = new Date();
  const season = getSeason(now);
  const next = daysToNextSeason(now);

  useFocusEffect(
    useCallback(() => {
      refreshWeather();
    }, [refreshWeather]),
  );

  const { tip, fact } = dailyTipAndFact(
    garden.plants.map((p) => p.plantId),
    now,
  );

  const needing = advice.filter((a) => a.verdict === 'zalij' || (a.verdict === 'zalito' && a.gardenPlant.lastWatered));
  const toWater = advice.filter((a) => a.verdict === 'zalij');
  const done = needing.length - toWater.length;
  const litres = toWater.reduce((s, a) => s + a.litres, 0);
  const warnings = Array.from(new Set(advice.flatMap((a) => a.warnings.map((w) => w.split(' – ')[0]))));
  const days = weather ? [weather.today, ...weather.forecast].slice(0, 7) : [];
  const selected = days[day];
  const maxRain = Math.max(8, ...days.map((d) => d.rain));

  const water = (a: PlantAdvice) => {
    haptic('success');
    updatePlant(a.gardenPlant.uid, { lastWatered: isoDate(new Date()), lastWateredMm: a.mm || 10 });
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
      refreshControl={<RefreshControl refreshing={weatherLoading} onRefresh={() => refreshWeather(true)} tintColor={colors.primary} />}
    >
      {/* ── Velký nadpis jako v iOS ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={{ flex: 1 }}>
          <T v="caption">{formatDateCz(now)}</T>
          <T v="largeTitle">{greeting(now)}</T>
        </View>
        <Pressable onPress={() => router.push('/poloha')}>
          <Glass radius={999} intensity={50} style={styles.placePill}>
            <View style={styles.placeInner}>
              <Ionicons name="location" size={14} color={colors.water} />
              <Text style={styles.placeText} numberOfLines={1}>
                {garden.location?.label ?? 'Nastavit'}
              </Text>
            </View>
          </Glass>
        </Pressable>
      </View>

      {/* ── Widget s počasím ── */}
      <LinearGradient
        colors={skyColors(weather?.current.code)}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={[styles.hero, shadow.md]}
      >
        <View style={styles.seasonRow}>
          <View style={styles.glassPill}>
            <Text style={styles.glassPillText}>
              {SEASON_ICON[season]} {season.charAt(0).toUpperCase() + season.slice(1)}
            </Text>
          </View>
          <Text style={styles.seasonNext}>
            {next.season} za {next.days} {plural(next.days, 'den', 'dny', 'dní')}
          </Text>
        </View>

        {weather ? (
          <Animated.View entering={FadeIn.duration(500)}>
            <View style={styles.nowRow}>
              <Ionicons name={weatherIcon(weather.current.code)} size={58} color="#FFFFFF" />
              <View style={{ marginLeft: 14 }}>
                <T v="display" color={colors.white}>
                  {Math.round(weather.current.temp)}°
                </T>
                <T v="bodyStrong" color="rgba(255,255,255,0.85)">
                  {describeWeather(weather.current.code).text} · {Math.round(weather.today.tMax)}° / {Math.round(weather.today.tMin)}°
                </T>
              </View>
            </View>

            <View style={styles.statsRow}>
              <Stat icon="water" value={`${fmt1(weather.past.reduce((s, d) => s + d.rain, 0))} mm`} label="srážky 7 dní" />
              <Stat
                icon="hourglass"
                value={(() => {
                  const n = daysSinceRain(weather);
                  return n === null ? '7+ dní' : n === 0 ? 'dnes' : `${n} ${plural(n, 'den', 'dny', 'dní')}`;
                })()}
                label="bez deště"
              />
              <Stat icon="thermometer" value={`${fmt1(weather.today.et0)} mm`} label="výpar dnes" />
            </View>

            {/* Předpověď – sloupce srážek, klepnutím vybereš den */}
            <View style={styles.forecast}>
              {days.map((d, i) => (
                <Pressable
                  key={d.date}
                  onPress={() => {
                    haptic();
                    setDay(i);
                  }}
                  style={[styles.fDay, i === day && styles.fDayActive]}
                >
                  <Text style={styles.fName}>{shortDay(d.date, i)}</Text>
                  <Ionicons name={weatherIcon(d.code)} size={20} color={colors.white} />
                  <Text style={styles.fTemp}>{Math.round(d.tMax)}°</Text>
                  <View style={styles.rainTrack}>
                    <View style={[styles.rainBar, { height: `${Math.min(100, (d.rain / maxRain) * 100)}%` }]} />
                  </View>
                </Pressable>
              ))}
            </View>
            {selected && <DayDetail d={selected} index={day} />}
          </Animated.View>
        ) : (
          <View style={{ paddingVertical: 20 }}>
            <T v="body" color="rgba(255,255,255,0.85)">
              {garden.location ? (weatherError ?? 'Načítám počasí…') : 'Nastav polohu zahrady a začnu sledovat počasí.'}
            </T>
            {weatherError && (
              <Button
                title="Zkusit znovu"
                variant="light"
                small
                icon="refresh"
                onPress={() => refreshWeather(true)}
                style={{ marginTop: 10, alignSelf: 'flex-start' }}
              />
            )}
          </View>
        )}
      </LinearGradient>

      <View style={styles.body}>
        {!garden.location ? (
          <Animated.View entering={FadeInDown.delay(100)}>
            <Card>
              <Avatar emoji="🗺️" size={56} />
              <T v="h2" style={{ marginTop: 12 }}>
                Najdi svou zahradu
              </T>
              <T v="body" color={colors.muted} style={{ marginTop: 4 }}>
                Vyhledej adresu nebo použij GPS. Na satelitní mapě pak obkreslíš zahradu a označíš, kde co roste.
              </T>
              <Button title="Najít na mapě" icon="map" onPress={() => router.push('/poloha')} style={{ marginTop: 16 }} />
            </Card>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(80)}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <ProgressRing done={done} total={needing.length} />
                <View style={{ flex: 1 }}>
                  <T v="caption">Dnešní zálivka</T>
                  <T v="h2" style={{ marginTop: 2 }}>
                    {garden.plants.length === 0
                      ? 'Přidej první rostlinu'
                      : !weather
                        ? 'Čekám na počasí…'
                        : toWater.length
                          ? `Zalij ${toWater.length} ${plural(toWater.length, 'rostlinu', 'rostliny', 'rostlin')}`
                          : needing.length
                            ? 'Hotovo, vše zalito 🎉'
                            : 'Dnes nezaléváš 🌿'}
                  </T>
                  {toWater.length > 0 && (
                    <T v="small" style={{ marginTop: 2 }}>
                      celkem asi {litres} litrů vody
                    </T>
                  )}
                </View>
              </View>
              {warnings.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {warnings.map((w) => (
                    <Pill
                      key={w}
                      label={w.replace(/^\S+\s/, '')}
                      color="#9A5A06"
                      bg={colors.sunSoft}
                      icon={w.startsWith('🥶') ? 'snow' : w.startsWith('🔥') ? 'flame' : 'warning'}
                    />
                  ))}
                </View>
              )}
            </Card>
          </Animated.View>
        )}

        {garden.location && (
          <Animated.View entering={FadeInDown.delay(140)}>
            <SectionHeader title="Plán zahrady" action="Upravit" onAction={() => router.push('/plan')} />
            <GardenMapPreview onPress={() => router.push('/plan')} />
          </Animated.View>
        )}

        <SectionHeader
          title="Rostliny dnes"
          action={garden.plants.length ? 'Přidat' : undefined}
          onAction={() => router.push('/katalog')}
        />
        {garden.plants.length === 0 ? (
          <Card onPress={() => router.push('/katalog')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Avatar emoji="🌱" />
              <View style={{ flex: 1 }}>
                <T v="h3">Co ti roste na zahradě?</T>
                <T v="small">Vyber rostliny a já ti každý den poradím.</T>
              </View>
              <Ionicons name="add-circle" size={30} color={colors.primary} />
            </View>
          </Card>
        ) : (
          advice.map((a, i) => (
            <Animated.View key={a.gardenPlant.uid} entering={FadeInDown.delay(180 + i * 50)}>
              <AdviceCard
                advice={a}
                open={expanded === a.gardenPlant.uid}
                onToggle={() => setExpanded(expanded === a.gardenPlant.uid ? null : a.gardenPlant.uid)}
                onWater={() => water(a)}
              />
            </Animated.View>
          ))
        )}

        <SectionHeader title="Tento měsíc" />
        <Card>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.iconTile, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="calendar" size={22} color={colors.primary} />
            </View>
            <T v="body" style={{ flex: 1 }}>
              {MONTH_TASKS[now.getMonth() + 1]}
            </T>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1, backgroundColor: colors.sunSoft }}>
            <Ionicons name="bulb" size={24} color={colors.sun} />
            <T v="caption" color="#9A5A06" style={{ marginTop: 8 }}>
              Tip dne
            </T>
            <T v="small" color={colors.text} style={{ marginTop: 4 }}>
              {tip}
            </T>
          </Card>
          <Card style={{ flex: 1, backgroundColor: colors.waterSoft }}>
            <Ionicons name="sparkles" size={24} color={colors.water} />
            <T v="caption" color={colors.water} style={{ marginTop: 8 }}>
              Věděli jste?
            </T>
            <T v="small" color={colors.text} style={{ marginTop: 4 }}>
              {fact}
            </T>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}

function DayDetail({ d, index }: { d: DayWeather; index: number }) {
  return (
    <View style={styles.dayDetail}>
      <Text style={styles.dayDetailTitle}>
        {index === 0 ? 'Dnes' : `${shortDay(d.date, index)} ${dayNumber(d.date)}`} · {describeWeather(d.code).text}
      </Text>
      <Text style={styles.dayDetailText}>
        🌡 {Math.round(d.tMax)}° / {Math.round(d.tMin)}° 💧 {fmt1(d.rain)} mm{d.rainChance !== null ? ` (${d.rainChance} %)` : ''} ☀️ výpar{' '}
        {fmt1(d.et0)} mm
      </Text>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color="#BFE8CC" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const size = 64;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 1;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceAlt} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={total && done < total ? colors.water : colors.primaryBright}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c * pct} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {total ? (
        <Text style={{ ...font.extrabold, fontSize: 16, color: colors.text }}>
          {done}/{total}
        </Text>
      ) : (
        <Ionicons name="leaf" size={22} color={colors.primaryBright} />
      )}
    </View>
  );
}

function AdviceCard({
  advice,
  open,
  onToggle,
  onWater,
}: {
  advice: PlantAdvice;
  open: boolean;
  onToggle: () => void;
  onWater: () => void;
}) {
  const v = VERDICT[advice.verdict];
  const { plant, gardenPlant } = advice;
  const canWater = advice.verdict === 'zalij' || advice.verdict === 'zkontroluj';
  return (
    <Card onPress={onToggle} style={{ padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar emoji={plant.emoji} bg={v.soft} ring={v.color} size={50} />
        <View style={{ flex: 1 }}>
          <T v="h3" numberOfLines={1}>
            {plant.name}
            {gardenPlant.note ? <T v="small"> · {gardenPlant.note}</T> : null}
          </T>
          <T v="small" color={v.color} style={{ ...font.semibold }} numberOfLines={open ? undefined : 1}>
            {advice.headline}
          </T>
        </View>
        {canWater ? (
          <Pressable
            onPress={onWater}
            hitSlop={8}
            style={({ pressed }) => [styles.waterBtn, pressed && { transform: [{ scale: 0.9 }] }]}
            accessibilityLabel={`Zalito: ${plant.name}`}
          >
            <Ionicons name="water" size={20} color={colors.white} />
          </Pressable>
        ) : (
          <Ionicons name={v.icon} size={26} color={v.color} />
        )}
      </View>
      {open && (
        <Animated.View entering={FadeIn.duration(250)}>
          <T v="small" color={colors.text} style={{ marginTop: 12 }}>
            {advice.reason}
          </T>
          {advice.warnings.map((w) => (
            <Banner key={w} tone={w.startsWith('🥶') ? 'frost' : 'sun'}>
              {w.replace(/^\S+\s/, '')}
            </Banner>
          ))}
          {advice.task && (
            <Banner tone="ok" icon="calendar">
              {advice.task}
            </Banner>
          )}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {canWater && <Button title="Zalito" icon="checkmark" small onPress={onWater} style={{ flex: 1 }} />}
            <Button
              title="Detail"
              icon="arrow-forward"
              variant="soft"
              small
              onPress={() => router.push({ pathname: '/rostlina', params: { uid: gardenPlant.uid } })}
              style={{ flex: 1 }}
            />
          </View>
        </Animated.View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 20, paddingBottom: 14 },
  hero: { marginHorizontal: 16, padding: 20, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', marginBottom: 6 },
  placePill: { maxWidth: 170, marginBottom: 4 },
  placeInner: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8 },
  placeText: { color: colors.text, ...font.semibold, fontSize: 14 },
  seasonRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  glassPill: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  glassPillText: { color: colors.white, ...font.bold, fontSize: 13 },
  seasonNext: { color: 'rgba(255,255,255,0.7)', ...font.medium, fontSize: 13 },
  nowRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  stat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    padding: 12,
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  statValue: { color: colors.white, ...font.extrabold, fontSize: 16, marginTop: 4 },
  statLabel: { color: 'rgba(255,255,255,0.7)', ...font.medium, fontSize: 11 },
  forecast: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, gap: 4 },
  fDay: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 18 },
  fDayActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  fName: { color: 'rgba(255,255,255,0.8)', ...font.bold, fontSize: 12 },
  fTemp: { color: colors.white, ...font.bold, fontSize: 13 },
  rainTrack: {
    width: 6,
    height: 28,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  rainBar: { width: 6, backgroundColor: '#8FD0FF', borderRadius: 3 },
  dayDetail: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 16, padding: 12 },
  dayDetailTitle: { color: colors.white, ...font.bold, fontSize: 14 },
  dayDetailText: { color: 'rgba(255,255,255,0.85)', ...font.medium, fontSize: 13, marginTop: 4 },
  body: { paddingHorizontal: 16, paddingTop: 12 },
  iconTile: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  waterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.water,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(44,123,208,0.35)',
  },
});
