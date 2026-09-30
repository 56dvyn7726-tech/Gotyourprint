import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getPlant } from '../data/plants';
import { centroid, fitZoom } from '../lib/geo';
import { useStore } from '../lib/store';
import { useAdvice, VERDICT } from '../lib/verdict';
import { MapViewState, SatelliteMap } from './SatelliteMap';
import { PlantPin } from './PlantPin';
import { colors, fonts, shadow } from './ui';

/** Malý náhled plánu zahrady; klepnutím otevře celou mapu. */
export function GardenMapPreview({ height = 180, onPress }: { height?: number; onPress: () => void }) {
  const { garden } = useStore();
  const { byUid } = useAdvice();
  const [width, setWidth] = useState(0);
  const [view, setView] = useState<MapViewState | null>(null);

  useEffect(() => {
    if (!width || !garden.location) return;
    const pts = [
      ...(garden.outline ?? []),
      ...garden.plants.flatMap((p) => (p.shape ? p.shape : p.pos ? [p.pos] : [])),
    ];
    if (pts.length >= 2) {
      const f = fitZoom(pts, width, height, 24);
      setView({ center: f.center, zoom: Math.min(f.zoom, 20) });
    } else {
      setView({ center: pts[0] ?? garden.location, zoom: 18.5 });
    }
  }, [width, height, garden.location, garden.outline, garden.plants]);

  if (!garden.location) return null;

  return (
    <View style={[styles.wrap, { height }, shadow.md]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {view && (
        <SatelliteMap
          view={view}
          onViewChange={() => {}}
          style={StyleSheet.absoluteFill}
          polygons={[
            ...(garden.outline
              ? [{ id: 'outline', points: garden.outline, fill: 'rgba(255,255,255,0.10)', stroke: '#FFFFFF', width: 2, dashed: true }]
              : []),
            ...garden.plants
              .filter((p) => p.shape)
              .map((p) => {
                const v = VERDICT[byUid[p.uid]?.verdict ?? 'nezalévej'];
                return { id: p.uid, points: p.shape!, fill: `${v.color}44`, stroke: v.color, width: 2 };
              }),
          ]}
          markers={garden.plants
            .filter((p) => p.pos || p.shape)
            .map((p) => ({
              id: p.uid,
              at: p.pos ?? centroid(p.shape!),
              width: 30,
              height: 30,
              anchor: 'center' as const,
              node: (
                <PlantPin
                  emoji={getPlant(p.plantId)?.emoji ?? '🌱'}
                  color={VERDICT[byUid[p.uid]?.verdict ?? 'nezalévej'].color}
                  size={30}
                />
              ),
            }))}
        />
      )}
      {/* Náhled je jen pro čtení – celé klepnutí otevře plán. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} accessibilityRole="button" accessibilityLabel="Otevřít plán zahrady">
        <View style={styles.badge}>
          <Ionicons name="expand" size={14} color={colors.forest} />
          <Text style={styles.badgeText}>Otevřít plán</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 24, overflow: 'hidden', backgroundColor: '#243328', marginBottom: 12 },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.94)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 13, color: colors.forest },
});
