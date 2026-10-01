import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlantPin } from '../../components/PlantPin';
import { MapMarker, MapPolygon, MapViewState, SatelliteMap } from '../../components/SatelliteMap';
import { Avatar, Button, colors, Glass, font, haptic, IconButton, Pill, shadow, T } from '../../components/ui';
import { getPlant } from '../../data/plants';
import { confirmAsk } from '../../lib/dialog';
import { centroid, fitZoom, formatArea, googleMapsUrl, polygonArea } from '../../lib/geo';
import { useStore } from '../../lib/store';
import { useAdvice, VERDICT } from '../../lib/verdict';
import { LatLon } from '../../types';

type Mode = { kind: 'idle' } | { kind: 'outline' } | { kind: 'place'; uid: string } | { kind: 'bed'; uid: string };

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ place?: string }>();
  const { garden, updateGarden, updatePlant } = useStore();
  const { byUid } = useAdvice();
  // Plán zabírá celou obrazovku – rozměr okna je spolehlivější než onLayout (na webu se u skrytých záložek nemusí ozvat).
  const window = useWindowDimensions();
  const size = { w: window.width, h: window.height };
  const [view, setView] = useState<MapViewState | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<LatLon[]>([]);

  const placedPoints = useMemo(
    () => [...(garden.outline ?? []), ...garden.plants.flatMap((p) => p.shape ?? (p.pos ? [p.pos] : []))],
    [garden.outline, garden.plants],
  );

  const fitAll = () => {
    if (!size.w || !garden.location) return;
    if (placedPoints.length >= 2) {
      const f = fitZoom(placedPoints, size.w, size.h - 260, 50);
      setView({ center: f.center, zoom: Math.min(f.zoom, 20.5) });
    } else {
      setView({ center: placedPoints[0] ?? garden.location, zoom: 19 });
    }
  };

  // Výřez nastav při prvním zobrazení a po změně polohy zahrady.
  useEffect(() => {
    fitAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, garden.location?.lat, garden.location?.lon]);

  // Přechod z přidání rostliny: rovnou ji umísti na mapu (každý požadavek jen jednou).
  const handledPlace = useRef<string | undefined>(undefined);
  useEffect(() => {
    const uid = params.place;
    if (!uid || uid === handledPlace.current || !garden.plants.some((p) => p.uid === uid)) return;
    handledPlace.current = uid;
    setSelected(null);
    setMode({ kind: 'place', uid });
  }, [params.place, garden.plants]);

  if (!garden.location) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top + 60 }]}>
        <Animated.View entering={FadeInDown} style={{ width: '100%', maxWidth: 420 }}>
          <Glass radius={32} intensity={50} style={shadow.md}>
            <View style={{ alignItems: 'center', padding: 28 }}>
              <Text style={{ fontSize: 72 }}>🗺️</Text>
              <T v="h1" style={{ textAlign: 'center', marginTop: 16 }}>
                Tvoje zahrada ze satelitu
              </T>
              <T v="body" color={colors.muted} style={{ textAlign: 'center', marginTop: 8, maxWidth: 320 }}>
                Najdi ji podle adresy, obkresli hranice a označ, kde ti co roste. Každý den uvidíš, co potřebuje vodu.
              </T>
              <Button
                title="Najít moji zahradu"
                icon="search"
                onPress={() => router.push('/poloha')}
                style={{ marginTop: 24, minWidth: 240 }}
              />
            </View>
          </Glass>
        </Animated.View>
      </View>
    );
  }

  const plantsOnMap = garden.plants.filter((p) => p.pos || p.shape);
  const unplaced = garden.plants.filter((p) => !p.pos && !p.shape);
  const selectedGp = garden.plants.find((p) => p.uid === selected);
  const drawing = mode.kind === 'outline' || mode.kind === 'bed';
  const draftArea = polygonArea(draft);
  const target = mode.kind === 'bed' || mode.kind === 'place' ? garden.plants.find((p) => p.uid === mode.uid) : undefined;
  const targetPlant = target ? getPlant(target.plantId) : undefined;

  const onTap = (p: LatLon) => {
    if (drawing) {
      haptic();
      setDraft((d) => [...d, p]);
    } else if (mode.kind === 'place') {
      haptic('success');
      updatePlant(mode.uid, { pos: p });
      setSelected(mode.uid);
      setMode({ kind: 'idle' });
    } else {
      setSelected(null);
    }
  };

  const startDraw = (m: Mode) => {
    setSelected(null);
    setDraft([]);
    setMode(m);
  };

  const saveDraw = () => {
    if (draft.length < 3) return;
    haptic('success');
    if (mode.kind === 'outline') {
      updateGarden({ outline: draft, areaM2: Math.round(draftArea) });
    } else if (mode.kind === 'bed') {
      updatePlant(mode.uid, { shape: draft, pos: centroid(draft), areaM2: Math.max(0.1, Math.round(draftArea * 10) / 10) });
      setSelected(mode.uid);
    }
    setDraft([]);
    setMode({ kind: 'idle' });
  };

  const polygons: MapPolygon[] = [
    ...(garden.outline && mode.kind !== 'outline'
      ? [{ id: 'outline', points: garden.outline, fill: 'rgba(255,255,255,0.08)', stroke: '#FFFFFF', width: 2.5, dashed: true }]
      : []),
    ...garden.plants
      .filter((p) => p.shape && !(mode.kind === 'bed' && mode.uid === p.uid))
      .map((p) => {
        const v = VERDICT[byUid[p.uid]?.verdict ?? 'nezalévej'];
        return {
          id: p.uid,
          points: p.shape!,
          fill: `${v.color}${p.uid === selected ? '66' : '40'}`,
          stroke: v.color,
          width: p.uid === selected ? 3.5 : 2,
        };
      }),
  ];

  const markers: MapMarker[] = plantsOnMap.map((p) => {
    const plant = getPlant(p.plantId);
    const v = VERDICT[byUid[p.uid]?.verdict ?? 'nezalévej'];
    const isSel = p.uid === selected;
    return {
      id: p.uid,
      at: p.pos ?? centroid(p.shape!),
      width: isSel ? 140 : 44,
      height: isSel ? 76 : 44,
      anchor: 'center',
      node: <PlantPin emoji={plant?.emoji ?? '🌱'} color={v.color} selected={isSel} label={isSel ? plant?.name : undefined} />,
      onPress:
        drawing || mode.kind === 'place'
          ? undefined
          : () => {
              haptic();
              setSelected(p.uid);
            },
    };
  });

  const counts = plantsOnMap.reduce<Record<string, number>>((acc, p) => {
    const k = byUid[p.uid]?.verdict ?? 'nezalévej';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <View style={{ flex: 1, backgroundColor: '#243328' }}>
      {view && (
        <SatelliteMap
          view={view}
          onViewChange={setView}
          onTap={onTap}
          polygons={polygons}
          markers={markers}
          draft={drawing ? draft : undefined}
          draftColor={mode.kind === 'bed' ? '#8FE3A8' : '#FFFFFF'}
          style={StyleSheet.absoluteFill}
          attributionStyle={{ top: insets.top + 78 }}
        />
      )}

      {/* ── Horní lišta ── */}
      <View style={[styles.top, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
        <Glass radius={22} intensity={60} style={[styles.titleCard, shadow.md]}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
            <T v="h3" numberOfLines={1}>
              {garden.name}
            </T>
            <T v="small" numberOfLines={1}>
              {garden.outline ? `${formatArea(polygonArea(garden.outline))} · ` : ''}
              {garden.location.label}
            </T>
          </View>
        </Glass>
        <IconButton icon="search" tone="glass" onPress={() => router.push('/poloha')} label="Změnit polohu" />
        <IconButton
          icon="logo-google"
          tone="glass"
          onPress={() => Linking.openURL(googleMapsUrl(view?.center ?? garden.location!))}
          label="Otevřít v Google Maps"
        />
      </View>

      {/* ── Zoom ── */}
      <View style={[styles.zoom, { top: insets.top + 110 }]} pointerEvents="box-none">
        <IconButton
          icon="add"
          tone="glass"
          size={42}
          onPress={() => view && setView({ ...view, zoom: Math.min(21.5, view.zoom + 1) })}
          label="Přiblížit"
        />
        <IconButton
          icon="remove"
          tone="glass"
          size={42}
          onPress={() => view && setView({ ...view, zoom: Math.max(4, view.zoom - 1) })}
          label="Oddálit"
        />
        <IconButton icon="scan" tone="glass" size={42} onPress={fitAll} label="Zobrazit celou zahradu" />
      </View>

      {/* ── Spodní panel ── */}
      <Animated.View entering={FadeInUp} style={[styles.panel, shadow.lg, { bottom: Math.max(insets.bottom, 12) + 76 }]}>
        <Glass radius={28} intensity={70} style={shadow.lg}>
          <View style={{ padding: 16 }}>
            {drawing ? (
              <View>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <T v="caption" color={colors.primaryBright}>
                      {mode.kind === 'outline' ? 'Hranice zahrady' : `Záhon · ${targetPlant?.name ?? ''}`}
                    </T>
                    <T v="h2">{draft.length < 3 ? 'Klepej na rohy na mapě' : formatArea(draftArea)}</T>
                    <T v="small">
                      {draft.length === 0
                        ? 'Postupně klepni na všechny rohy, mapou můžeš mezitím posouvat.'
                        : `${draft.length} ${draft.length === 1 ? 'bod' : draft.length < 5 ? 'body' : 'bodů'} · ${draft.length < 3 ? 'ještě ' + (3 - draft.length) + ' a spočítám plochu' : 'plocha se počítá automaticky'}`}
                    </T>
                  </View>
                </View>
                <View style={styles.actions}>
                  <Button
                    title="Zpět"
                    icon="arrow-undo"
                    variant="ghost"
                    small
                    disabled={!draft.length}
                    onPress={() => setDraft((d) => d.slice(0, -1))}
                    style={{ flex: 1 }}
                  />
                  <Button title="Zrušit" variant="ghost" small onPress={() => startDraw({ kind: 'idle' })} style={{ flex: 1 }} />
                  <Button title="Uložit" icon="checkmark" small disabled={draft.length < 3} onPress={saveDraw} style={{ flex: 1.2 }} />
                </View>
              </View>
            ) : mode.kind === 'place' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar emoji={targetPlant?.emoji ?? '🌱'} />
                <View style={{ flex: 1 }}>
                  <T v="h3">Kde roste {targetPlant?.name.toLowerCase()}?</T>
                  <T v="small">Klepni na místo na mapě.</T>
                </View>
                <Button title="Zrušit" variant="ghost" small onPress={() => setMode({ kind: 'idle' })} />
              </View>
            ) : selectedGp ? (
              <SelectedPanel
                uid={selectedGp.uid}
                onClose={() => setSelected(null)}
                onMove={() => {
                  setSelected(null);
                  setMode({ kind: 'place', uid: selectedGp.uid });
                }}
                onBed={() => startDraw({ kind: 'bed', uid: selectedGp.uid })}
                onRemove={async () => {
                  if (await confirmAsk('Odebrat z plánu?', 'Rostlina zůstane v seznamu, jen zmizí z mapy.', 'Odebrat', true)) {
                    updatePlant(selectedGp.uid, { pos: undefined, shape: undefined });
                    setSelected(null);
                  }
                }}
              />
            ) : (
              <View>
                {!garden.outline ? (
                  <Pressable style={styles.cta} onPress={() => startDraw({ kind: 'outline' })}>
                    <View style={styles.ctaIcon}>
                      <Ionicons name="create" size={22} color={colors.white} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T v="h3">Obkresli svou zahradu</T>
                      <T v="small">Spočítám přesnou rozlohu.</T>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                  </Pressable>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                    {(['zalij', 'zkontroluj', 'nezalévej', 'zalito', 'odpočívá'] as const)
                      .filter((k) => counts[k])
                      .map((k) => (
                        <Pill
                          key={k}
                          label={`${VERDICT[k].label} ${counts[k]}`}
                          color={VERDICT[k].color}
                          bg={VERDICT[k].soft}
                          icon={VERDICT[k].icon}
                        />
                      ))}
                    {!plantsOnMap.length && <T v="small">Na mapě zatím nejsou žádné rostliny.</T>}
                  </View>
                )}

                {unplaced.length > 0 ? (
                  <>
                    <T v="caption" style={{ marginTop: 12, marginBottom: 8 }}>
                      Umísti na mapu ({unplaced.length})
                    </T>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {unplaced.map((p) => {
                        const plant = getPlant(p.plantId);
                        return (
                          <Pressable
                            key={p.uid}
                            onPress={() => {
                              haptic();
                              setMode({ kind: 'place', uid: p.uid });
                            }}
                            style={styles.unplaced}
                          >
                            <Text style={{ fontSize: 22 }}>{plant?.emoji}</Text>
                            <Text style={styles.unplacedText} numberOfLines={1}>
                              {plant?.name}
                            </Text>
                            <Ionicons name="locate" size={16} color={colors.primaryBright} />
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </>
                ) : (
                  <View style={styles.actions}>
                    {garden.outline && (
                      <Button
                        title="Upravit hranice"
                        icon="create-outline"
                        variant="ghost"
                        small
                        onPress={() => startDraw({ kind: 'outline' })}
                        style={{ flex: 1 }}
                      />
                    )}
                    <Button
                      title="Přidat rostlinu"
                      icon="add"
                      variant="soft"
                      small
                      onPress={() => router.push('/katalog')}
                      style={{ flex: 1 }}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        </Glass>
      </Animated.View>
    </View>
  );
}

function SelectedPanel({
  uid,
  onClose,
  onMove,
  onBed,
  onRemove,
}: {
  uid: string;
  onClose: () => void;
  onMove: () => void;
  onBed: () => void;
  onRemove: () => void;
}) {
  const { garden } = useStore();
  const { byUid } = useAdvice();
  const gp = garden.plants.find((p) => p.uid === uid)!;
  const plant = getPlant(gp.plantId);
  const advice = byUid[uid];
  const v = VERDICT[advice?.verdict ?? 'nezalévej'];
  return (
    <Animated.View entering={FadeInDown.duration(250)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar emoji={plant?.emoji ?? '🌱'} bg={v.soft} ring={v.color} size={52} />
        <View style={{ flex: 1 }}>
          <T v="h3">
            {plant?.name}
            {gp.note ? <T v="small"> · {gp.note}</T> : null}
          </T>
          <T v="small">
            {gp.shape ? `záhon ${formatArea(polygonArea(gp.shape))}` : `${gp.areaM2} m²`} · {gp.placement}
          </T>
        </View>
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Zavřít">
          <Ionicons name="close-circle" size={28} color={colors.faint} />
        </Pressable>
      </View>
      {advice && (
        <View style={[styles.verdict, { backgroundColor: v.soft }]}>
          <Ionicons name={v.icon} size={18} color={v.color} />
          <Text style={[styles.verdictText, { color: v.color }]} numberOfLines={2}>
            {advice.headline}
          </Text>
        </View>
      )}
      <View style={styles.actions}>
        <Button title="Detail" small onPress={() => router.push({ pathname: '/rostlina', params: { uid } })} style={{ flex: 1 }} />
        <Button title="Přesunout" variant="soft" small onPress={onMove} style={{ flex: 1.2 }} />
        <Button title="Záhon" icon="shapes" variant="soft" small onPress={onBed} style={{ flex: 1 }} />
      </View>
      <Pressable onPress={onRemove} style={{ alignSelf: 'center', marginTop: 10 }} hitSlop={8}>
        <Text style={{ color: colors.danger, ...font.semibold, fontSize: 13 }}>Odebrat z plánu</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', paddingHorizontal: 24 },
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  titleCard: { flex: 1 },
  zoom: { position: 'absolute', right: 12, gap: 10 },
  panel: {
    position: 'absolute',
    left: 12,
    right: 12,
    maxWidth: 520,
    alignSelf: 'center',
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ctaIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  unplaced: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bg,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    maxWidth: 190,
  },
  unplacedText: { ...font.semibold, fontSize: 14, color: colors.text },
  verdict: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 10, marginTop: 12 },
  verdictText: { flex: 1, ...font.semibold, fontSize: 14 },
});
