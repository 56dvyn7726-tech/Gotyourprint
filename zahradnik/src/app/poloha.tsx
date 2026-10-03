import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapViewState, SatelliteMap } from '../components/SatelliteMap';
import { Button, colors, font, haptic, IconButton, Input, shadow, T } from '../components/ui';
import { notify } from '../lib/dialog';
import { Address, placeName, searchAddress } from '../lib/geocode';
import { useStore } from '../lib/store';

const CZECHIA: MapViewState = { center: { lat: 49.8, lon: 15.5 }, zoom: 7 };

export default function LocationPicker() {
  const insets = useSafeAreaInsets();
  const { garden, updateGarden } = useStore();
  const [view, setView] = useState<MapViewState>(garden.location ? { center: garden.location, zoom: 18.5 } : CZECHIA);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Address[] | null>(null);
  const [label, setLabel] = useState<string | null>(garden.location?.label ?? null);
  const [busy, setBusy] = useState<'search' | 'gps' | 'save' | null>(null);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    Keyboard.dismiss();
    setBusy('search');
    try {
      setResults(await searchAddress(q));
    } catch (e: any) {
      notify('Hledání selhalo', e?.message ?? 'Zkus to prosím znovu.');
    } finally {
      setBusy(null);
    }
  };

  const pick = (a: Address) => {
    haptic();
    setView({ center: { lat: a.lat, lon: a.lon }, zoom: 19 });
    setLabel(a.title);
    setResults(null);
    setQuery('');
  };

  const gps = async () => {
    setBusy('gps');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        notify('Bez polohy', 'Povol přístup k poloze, nebo vyhledej adresu.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setView({ center: { lat: pos.coords.latitude, lon: pos.coords.longitude }, zoom: 19.5 });
      setLabel(null);
    } catch (e: any) {
      notify('Poloha nedostupná', e?.message ?? 'Zkus to venku nebo vyhledej adresu.');
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    setBusy('save');
    const { lat, lon } = view.center;
    const name = label ?? (await placeName(lat, lon)) ?? `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    updateGarden({ location: { lat, lon, label: name } });
    haptic('success');
    setBusy(null);
    if (router.canGoBack()) router.back();
    else router.replace('/plan');
  };

  const zoomedIn = view.zoom >= 15;

  return (
    <View style={{ flex: 1, backgroundColor: '#243328' }}>
      <SatelliteMap
        view={view}
        onViewChange={(v) => {
          setView(v);
          // Po posunutí mapy už název z hledání neplatí – dohledá se při uložení.
          if (label && Math.abs(v.zoom - view.zoom) < 0.01) setLabel(null);
        }}
        style={StyleSheet.absoluteFill}
        attributionStyle={{ top: insets.top + 70 }}
      >
        {/* Zaměřovač uprostřed mapy */}
        <View style={styles.crosshair} pointerEvents="none">
          <Ionicons name="location" size={48} color={colors.white} style={styles.pinShadow} />
          <View style={styles.pinDot} />
        </View>
      </SatelliteMap>

      <View style={[styles.top, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <IconButton icon="arrow-back" tone="glass" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} label="Zpět" />
        <Input
          icon="search"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          placeholder="Adresa zahrady, např. Lipová 12, Tábor"
          returnKeyType="search"
          style={[{ flex: 1, borderWidth: 0 }, shadow.md]}
        />
      </View>

      {(results || busy === 'search') && (
        <Animated.View entering={FadeIn} style={[styles.results, shadow.lg, { top: insets.top + 70 }]}>
          {busy === 'search' ? (
            <ActivityIndicator color={colors.primary} style={{ padding: 16 }} />
          ) : results && results.length === 0 ? (
            <T v="body" color={colors.muted} style={{ padding: 16 }}>
              Nic jsem nenašel. Zkus přidat obec.
            </T>
          ) : (
            results?.map((r, i) => (
              <Pressable
                key={`${r.lat},${r.lon},${i}`}
                onPress={() => pick(r)}
                style={({ pressed }) => [styles.result, pressed && { backgroundColor: colors.bg }]}
              >
                <Ionicons name="location-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle}>{r.title}</Text>
                  <Text style={styles.resultSub} numberOfLines={1}>
                    {r.subtitle}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </Animated.View>
      )}

      {!results && busy !== 'search' && (
        <View style={[styles.gps, { top: insets.top + 74 }]} pointerEvents="box-none">
          <IconButton icon={busy === 'gps' ? 'hourglass' : 'navigate'} tone="primary" onPress={gps} label="Moje poloha" />
        </View>
      )}

      <Animated.View entering={FadeInUp} style={[styles.panel, shadow.lg, { paddingBottom: Math.max(insets.bottom, 16) + 4 }]}>
        <T v="caption" color={colors.primaryBright}>
          Poloha zahrady
        </T>
        <T v="h2" numberOfLines={1} style={{ marginTop: 2 }}>
          {label ?? (zoomedIn ? 'Vybrané místo' : 'Najdi svou zahradu')}
        </T>
        <T v="small" style={{ marginTop: 2 }}>
          {zoomedIn ? 'Posuň mapu tak, aby špendlík byl uprostřed tvé zahrady.' : 'Vyhledej adresu, použij GPS, nebo mapu přibliž prsty.'}
        </T>
        <Button
          title="Tady je moje zahrada"
          icon="checkmark-circle"
          onPress={confirm}
          loading={busy === 'save'}
          disabled={!zoomedIn}
          style={{ marginTop: 14 }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', gap: 8, paddingHorizontal: 12, alignItems: 'center' },
  results: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingVertical: 6,
    maxWidth: 560,
    alignSelf: 'center',
  },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  resultTitle: { ...font.bold, fontSize: 15, color: colors.text },
  resultSub: { ...font.medium, fontSize: 13, color: colors.muted },
  gps: { position: 'absolute', right: 12 },
  crosshair: { position: 'absolute', left: '50%', top: '50%', marginLeft: -24, marginTop: -46, alignItems: 'center' },
  pinShadow: { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } },
  pinDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white, marginTop: -4, boxShadow: '0 0 0 3px rgba(0,0,0,0.3)' },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },
});
