import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Banner, Button, Card, colors, Muted, SectionTitle } from '../../components/ui';
import { adviseForPlant, dailyTipAndFact, daysSinceRain, PlantAdvice, WaterVerdict } from '../../lib/advice';
import {
  daysToNextSeason,
  formatDateCz,
  getSeason,
  isoDate,
  MONTH_NAMES,
  MONTH_TASKS,
  SEASON_EMOJI,
} from '../../lib/season';
import { useStore } from '../../lib/store';
import { describeWeather } from '../../lib/weather';

const ORDER: Record<WaterVerdict, number> = { zalij: 0, zkontroluj: 1, nezalévej: 2, zalito: 3, odpočívá: 4 };

const VERDICT_STYLE: Record<WaterVerdict, { bg: string; fg: string; icon: string }> = {
  zalij: { bg: colors.waterSoft, fg: colors.water, icon: '💧' },
  zkontroluj: { bg: colors.warnSoft, fg: colors.warn, icon: '🤔' },
  nezalévej: { bg: colors.primarySoft, fg: colors.primaryDark, icon: '✅' },
  zalito: { bg: colors.primarySoft, fg: colors.primaryDark, icon: '✅' },
  odpočívá: { bg: '#EEEEEE', fg: colors.muted, icon: '😴' },
};

export default function TodayScreen() {
  const { garden, weather, weatherError, weatherLoading, refreshWeather, updatePlant } = useStore();
  const now = new Date();
  const season = getSeason(now);
  const next = daysToNextSeason(now);

  useFocusEffect(
    useCallback(() => {
      refreshWeather();
    }, [refreshWeather]),
  );

  const advice = useMemo(() => {
    if (!weather) return [];
    return garden.plants
      .map((gp) => adviseForPlant(gp, weather, new Date()))
      .filter((a): a is PlantAdvice => a !== null)
      .sort((a, b) => ORDER[a.verdict] - ORDER[b.verdict]);
  }, [garden.plants, weather]);

  const { tip, fact } = dailyTipAndFact(
    garden.plants.map((p) => p.plantId),
    now,
  );

  const toWater = advice.filter((a) => a.verdict === 'zalij');
  const totalLitres = toWater.reduce((s, a) => s + a.litres, 0);
  const allWarnings = Array.from(new Set(advice.flatMap((a) => a.warnings.map((w) => w.split(' – ')[0]))));
  const sinceRain = weather ? daysSinceRain(weather) : null;
  const rain7 = weather ? weather.past.reduce((s, d) => s + d.rain, 0) : 0;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={weatherLoading} onRefresh={() => refreshWeather(true)} />}
    >
      <Text style={styles.date}>{formatDateCz(now)}</Text>
      <Text style={styles.season}>
        {SEASON_EMOJI[season]} {capitalize(season)} · {next.season} začne za {next.days} {dny(next.days)}
      </Text>

      {!garden.location ? (
        <Card>
          <Text style={styles.cardTitle}>Kde je tvoje zahrada?</Text>
          <Muted>Nastav polohu, abych mohl sledovat srážky a teploty a radit ti se zálivkou.</Muted>
          <Button title="Nastavit polohu" onPress={() => router.push('/nastaveni')} style={{ marginTop: 12 }} />
        </Card>
      ) : weather ? (
        <Card>
          <View style={styles.row}>
            <Text style={styles.bigEmoji}>{describeWeather(weather.current.code).emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.temp}>{Math.round(weather.current.temp)} °C</Text>
              <Muted>
                {describeWeather(weather.current.code).text} · vlhkost {weather.current.humidity} % · vítr{' '}
                {Math.round(weather.current.wind)} km/h
              </Muted>
              <Muted>📍 {garden.location.label}</Muted>
            </View>
          </View>
          <View style={styles.statsRow}>
            <Stat label="Srážky 7 dní" value={`${rain7.toFixed(1)} mm`} />
            <Stat
              label="Bez deště"
              value={sinceRain === null ? '7+ dní' : sinceRain === 0 ? 'dnes pršelo' : `${sinceRain} ${dny(sinceRain)}`}
            />
            <Stat label="Dnes výpar" value={`${weather.today.et0.toFixed(1)} mm`} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {[weather.today, ...weather.forecast].slice(0, 7).map((d, i) => (
              <View key={d.date} style={styles.day}>
                <Text style={styles.dayName}>{i === 0 ? 'Dnes' : shortDay(d.date)}</Text>
                <Text style={{ fontSize: 22 }}>{describeWeather(d.code).emoji}</Text>
                <Text style={styles.dayTemp}>
                  {Math.round(d.tMax)}° / {Math.round(d.tMin)}°
                </Text>
                <Text style={styles.dayRain}>{d.rain > 0 ? `${d.rain.toFixed(1)} mm` : '–'}</Text>
              </View>
            ))}
          </ScrollView>
        </Card>
      ) : (
        <Card>
          <Muted>{weatherError ?? 'Načítám počasí…'}</Muted>
          {weatherError && <Button title="Zkusit znovu" variant="secondary" onPress={() => refreshWeather(true)} style={{ marginTop: 8 }} />}
        </Card>
      )}
      {weatherError && weather && <Banner>Nepodařilo se obnovit počasí, zobrazuji poslední uložené.</Banner>}

      <SectionTitle>Dnes na zahradě</SectionTitle>
      {garden.plants.length === 0 ? (
        <Card>
          <Text style={styles.cardTitle}>Zatím tu nic neroste 🌱</Text>
          <Muted>Vyber si rostliny, které máš na zahradě, a každý den ti řeknu, co potřebují.</Muted>
          <Button title="Přidat rostliny" onPress={() => router.push('/katalog')} style={{ marginTop: 12 }} />
        </Card>
      ) : !weather ? (
        <Card>
          <Muted>Rady k zálivce se zobrazí, jakmile budu znát počasí.</Muted>
        </Card>
      ) : (
        <>
          <Card style={{ backgroundColor: toWater.length ? colors.waterSoft : colors.primarySoft }}>
            <Text style={styles.cardTitle}>
              {toWater.length
                ? `💧 Dnes zalij ${toWater.length} ${toWater.length === 1 ? 'rostlinu' : toWater.length < 5 ? 'rostliny' : 'rostlin'} (~${totalLitres} l)`
                : '✅ Dnes není potřeba zalévat'}
            </Text>
            {allWarnings.length > 0 && <Muted style={{ marginTop: 4 }}>{allWarnings.join(' · ')}</Muted>}
          </Card>
          {advice.map((a) => (
            <AdviceCard
              key={a.gardenPlant.uid}
              advice={a}
              onWatered={() => updatePlant(a.gardenPlant.uid, { lastWatered: isoDate(new Date()), lastWateredMm: a.mm || 10 })}
            />
          ))}
        </>
      )}

      <SectionTitle>Co dělat v {locative(now.getMonth())}</SectionTitle>
      <Card>
        <Muted style={{ color: colors.text }}>{MONTH_TASKS[now.getMonth() + 1]}</Muted>
      </Card>

      <SectionTitle>Tip dne</SectionTitle>
      <Card>
        <Text style={styles.body}>💡 {tip}</Text>
      </Card>
      <SectionTitle>Věděli jste, že…</SectionTitle>
      <Card>
        <Text style={styles.body}>🧠 {fact}</Text>
      </Card>
    </ScrollView>
  );
}

function AdviceCard({ advice, onWatered }: { advice: PlantAdvice; onWatered: () => void }) {
  const s = VERDICT_STYLE[advice.verdict];
  const { plant, gardenPlant } = advice;
  return (
    <Pressable onPress={() => router.push(`/rostlina/${gardenPlant.uid}`)}>
      <Card>
        <View style={styles.row}>
          <Text style={styles.plantEmoji}>{plant.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              {plant.name}
              {gardenPlant.note ? ` · ${gardenPlant.note}` : ''}
            </Text>
            <Muted>
              {gardenPlant.placement} · {gardenPlant.sun} · {gardenPlant.areaM2} m²
            </Muted>
          </View>
        </View>
        <View style={[styles.verdict, { backgroundColor: s.bg }]}>
          <Text style={{ color: s.fg, fontWeight: '700', fontSize: 15 }}>
            {s.icon} {advice.headline}
          </Text>
          <Text style={{ color: s.fg, marginTop: 4, fontSize: 13, lineHeight: 18 }}>{advice.reason}</Text>
        </View>
        {advice.warnings.map((w) => (
          <Banner key={w}>{w}</Banner>
        ))}
        {advice.task && <Banner tone="ok">📅 {advice.task}</Banner>}
        {(advice.verdict === 'zalij' || advice.verdict === 'zkontroluj') && (
          <Button title="Zalito ✓" variant="secondary" onPress={onWatered} style={{ marginTop: 10 }} />
        )}
      </Card>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dny(n: number) {
  return n === 1 ? 'den' : n >= 2 && n <= 4 ? 'dny' : 'dní';
}

function shortDay(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'][d.getDay()] + ` ${d.getDate()}.`;
}

function locative(month: number) {
  const names = [
    'lednu', 'únoru', 'březnu', 'dubnu', 'květnu', 'červnu',
    'červenci', 'srpnu', 'září', 'říjnu', 'listopadu', 'prosinci',
  ];
  return names[month] ?? MONTH_NAMES[month];
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  date: { fontSize: 24, fontWeight: '800', color: colors.text },
  season: { fontSize: 15, color: colors.muted, marginBottom: 12, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigEmoji: { fontSize: 48 },
  temp: { fontSize: 32, fontWeight: '800', color: colors.text },
  statsRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  stat: { flex: 1, backgroundColor: colors.bg, borderRadius: 10, padding: 8, alignItems: 'center' },
  statValue: { fontWeight: '700', color: colors.text, fontSize: 14 },
  statLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  day: { alignItems: 'center', marginRight: 14, minWidth: 56 },
  dayName: { fontSize: 12, color: colors.muted },
  dayTemp: { fontSize: 12, color: colors.text, fontWeight: '600' },
  dayRain: { fontSize: 11, color: colors.water },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  plantEmoji: { fontSize: 34 },
  verdict: { borderRadius: 12, padding: 12, marginTop: 12 },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
});
