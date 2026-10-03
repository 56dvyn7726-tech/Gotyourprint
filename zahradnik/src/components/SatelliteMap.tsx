import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Image, PanResponder, Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline } from 'react-native-svg';
import { LatLon } from '../types';
import { MAX_TILE_ZOOM, project, TILE_ATTRIBUTION, TILE_SIZE, tileUrl, unproject } from '../lib/geo';
import { font } from './ui';

export interface MapViewState {
  center: LatLon;
  zoom: number;
}

export interface MapPolygon {
  id: string;
  points: LatLon[];
  fill: string;
  stroke: string;
  width?: number;
  dashed?: boolean;
}

export interface MapMarker {
  id: string;
  at: LatLon;
  width: number;
  height: number;
  /** 'bottom' = špička značky je na souřadnici (špendlík), 'center' = střed. */
  anchor?: 'bottom' | 'center';
  node: React.ReactNode;
  onPress?: () => void;
}

interface Props {
  view: MapViewState;
  onViewChange: (v: MapViewState) => void;
  onTap?: (p: LatLon) => void;
  polygons?: MapPolygon[];
  markers?: MapMarker[];
  /** Právě kreslený mnohoúhelník. */
  draft?: LatLon[];
  draftColor?: string;
  minZoom?: number;
  maxZoom?: number;
  style?: StyleProp<ViewStyle>;
  /** Umístění popisku zdroje snímků (aby ho nepřekryl panel). */
  attributionStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

const TAP_SLOP = 6;

export function SatelliteMap({
  view,
  onViewChange,
  onTap,
  polygons = [],
  markers = [],
  draft,
  draftColor = '#FFFFFF',
  minZoom = 4,
  maxZoom = 21.5,
  style,
  attributionStyle,
  children,
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const containerRef = useRef<View>(null);
  const offset = useRef({ x: 0, y: 0 });

  // Nejnovější hodnoty pro obsluhu gest (PanResponder se vytváří jen jednou).
  const latest = useRef({ view, size, onViewChange, onTap, minZoom, maxZoom });
  latest.current = { view, size, onViewChange, onTap, minZoom, maxZoom };

  const clampZoom = (z: number) => Math.max(latest.current.minZoom, Math.min(latest.current.maxZoom, z));

  // Změny pohledu posíláme maximálně jednou za snímek.
  const pending = useRef<MapViewState | null>(null);
  const frame = useRef<number | null>(null);
  const emit = (v: MapViewState) => {
    pending.current = v;
    latest.current.view = v;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (pending.current) latest.current.onViewChange(pending.current);
    });
  };
  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  /** Přiblíží/oddálí tak, aby bod pod prstem (kurzorem) zůstal na místě. */
  const zoomAround = (focal: { x: number; y: number }, geo: LatLon, zoom: number) => {
    const { w, h } = latest.current.size;
    const fp = project(geo, zoom);
    const center = unproject({ x: fp.x - (focal.x - w / 2), y: fp.y - (focal.y - h / 2) }, zoom);
    emit({ center, zoom });
  };

  const screenToGeo = (sx: number, sy: number): LatLon => {
    const { view: v, size: s } = latest.current;
    const c = project(v.center, v.zoom);
    return unproject({ x: c.x + sx - s.w / 2, y: c.y + sy - s.h / 2 }, v.zoom);
  };

  const measure = () =>
    containerRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      if (typeof pageX === 'number') offset.current = { x: pageX, y: pageY };
    });

  const gesture = useRef({
    baseCenter: { x: 0, y: 0 },
    baseZoom: 0,
    baseDx: 0,
    baseDy: 0,
    touches: 0,
    pinch: null as null | { d0: number; zoom0: number; geo: LatLon },
    moved: false,
  });

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        // Tah začatý na značce převezme mapa, jakmile se prst pohne.
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > TAP_SLOP,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          measure();
          const g = gesture.current;
          const v = latest.current.view;
          g.baseCenter = project(v.center, v.zoom);
          g.baseZoom = v.zoom;
          g.baseDx = 0;
          g.baseDy = 0;
          g.touches = Math.max(1, e.nativeEvent.touches?.length ?? 1);
          g.pinch = null;
          g.moved = false;
        },
        onPanResponderMove: (e, gs) => {
          const g = gesture.current;
          const touches = e.nativeEvent.touches ?? [];
          const count = Math.max(1, touches.length);
          if (Math.abs(gs.dx) + Math.abs(gs.dy) > TAP_SLOP) g.moved = true;

          if (count !== g.touches) {
            // Změnil se počet prstů – začni měřit znovu od aktuálního stavu.
            const v = latest.current.view;
            g.baseCenter = project(v.center, v.zoom);
            g.baseZoom = v.zoom;
            g.baseDx = gs.dx;
            g.baseDy = gs.dy;
            g.touches = count;
            g.pinch = null;
          }

          if (count >= 2) {
            g.moved = true;
            const [a, b] = touches;
            const d = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
            const focal = { x: (a.pageX + b.pageX) / 2 - offset.current.x, y: (a.pageY + b.pageY) / 2 - offset.current.y };
            if (!g.pinch) {
              g.pinch = { d0: d, zoom0: latest.current.view.zoom, geo: screenToGeo(focal.x, focal.y) };
              return;
            }
            const zoom = clampZoom(g.pinch.zoom0 + Math.log2(d / Math.max(1, g.pinch.d0)));
            zoomAround(focal, g.pinch.geo, zoom);
            return;
          }

          const center = unproject(
            { x: g.baseCenter.x - (gs.dx - g.baseDx), y: g.baseCenter.y - (gs.dy - g.baseDy) },
            g.baseZoom,
          );
          emit({ center, zoom: g.baseZoom });
        },
        onPanResponderRelease: (e: GestureResponderEvent) => {
          const g = gesture.current;
          if (!g.moved && latest.current.onTap) {
            const sx = e.nativeEvent.pageX - offset.current.x;
            const sy = e.nativeEvent.pageY - offset.current.y;
            latest.current.onTap(screenToGeo(sx, sy));
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Web: kolečko myši přibližuje, prohlížeč nesmí stránku posouvat ani zvětšovat.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node?.addEventListener) return;
    node.style.touchAction = 'none';
    node.style.userSelect = 'none';
    node.style.cursor = 'grab';
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const rect = node.getBoundingClientRect();
      const focal = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      const geo = screenToGeo(focal.x, focal.y);
      zoomAround(focal, geo, clampZoom(latest.current.view.zoom - ev.deltaY * 0.0025));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { w, h } = size;
  const centerPx = project(view.center, view.zoom);
  const toScreen = (p: LatLon) => {
    const q = project(p, view.zoom);
    return { x: q.x - centerPx.x + w / 2, y: q.y - centerPx.y + h / 2 };
  };

  // ── Dlaždice ──
  const tiles: React.ReactNode[] = [];
  if (w > 0 && h > 0) {
    const tz = Math.max(0, Math.min(MAX_TILE_ZOOM, Math.floor(view.zoom)));
    const scale = Math.pow(2, view.zoom - tz);
    const c = project(view.center, tz);
    const left = c.x - w / 2 / scale;
    const top = c.y - h / 2 / scale;
    const n = Math.pow(2, tz);
    const x0 = Math.floor(left / TILE_SIZE);
    const x1 = Math.floor((left + w / scale) / TILE_SIZE);
    const y0 = Math.max(0, Math.floor(top / TILE_SIZE));
    const y1 = Math.min(n - 1, Math.floor((top + h / scale) / TILE_SIZE));
    const px = TILE_SIZE * scale;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const wx = ((tx % n) + n) % n;
        tiles.push(
          <Image
            key={`${tz}/${tx}/${ty}`}
            source={{ uri: tileUrl(tz, wx, ty) }}
            fadeDuration={0}
            style={{
              position: 'absolute',
              left: Math.floor((tx * TILE_SIZE - left) * scale),
              top: Math.floor((ty * TILE_SIZE - top) * scale),
              width: Math.ceil(px) + 1,
              height: Math.ceil(px) + 1,
            }}
          />,
        );
      }
    }
  }

  const pts = (list: LatLon[]) => list.map((p) => toScreen(p)).map((p) => `${p.x},${p.y}`).join(' ');
  const draftPts = draft?.map(toScreen) ?? [];

  return (
    <View
      ref={containerRef}
      style={[styles.container, style]}
      onLayout={(e) => {
        setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
        measure();
      }}
      {...responder.panHandlers}
    >
      {tiles}

      {w > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={w} height={h}>
            {polygons
              .filter((p) => p.points.length >= 3)
              .map((p) => (
                <Polygon
                  key={p.id}
                  points={pts(p.points)}
                  fill={p.fill}
                  stroke={p.stroke}
                  strokeWidth={p.width ?? 2.5}
                  strokeDasharray={p.dashed ? '8 6' : undefined}
                  strokeLinejoin="round"
                />
              ))}
            {draftPts.length >= 3 && (
              <Polygon points={draftPts.map((p) => `${p.x},${p.y}`).join(' ')} fill={`${draftColor}33`} stroke="none" />
            )}
            {draftPts.length >= 2 && (
              <Polyline
                points={draftPts.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={draftColor}
                strokeWidth={3}
                strokeLinejoin="round"
              />
            )}
            {draftPts.length >= 3 && (
              <Line
                x1={draftPts[draftPts.length - 1].x}
                y1={draftPts[draftPts.length - 1].y}
                x2={draftPts[0].x}
                y2={draftPts[0].y}
                stroke={draftColor}
                strokeWidth={2}
                strokeDasharray="6 6"
              />
            )}
            {draftPts.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={i === 0 ? 8 : 6} fill={draftColor} stroke="#12301F" strokeWidth={2} />
            ))}
          </Svg>
        </View>
      )}

      {w > 0 &&
        markers.map((m) => {
          const s = toScreen(m.at);
          if (s.x < -m.width || s.y < -m.height || s.x > w + m.width || s.y > h + m.height) return null;
          const top = m.anchor === 'center' ? s.y - m.height / 2 : s.y - m.height;
          const style = { position: 'absolute' as const, left: s.x - m.width / 2, top, width: m.width, height: m.height };
          return m.onPress ? (
            <Pressable key={m.id} style={style} onPress={m.onPress} hitSlop={6}>
              {m.node}
            </Pressable>
          ) : (
            <View key={m.id} style={style} pointerEvents="none">
              {m.node}
            </View>
          );
        })}

      <View style={[styles.attribution, attributionStyle ?? { bottom: 4 }]} pointerEvents="none">
        <Text style={styles.attributionText}>{TILE_ATTRIBUTION}</Text>
      </View>

      {children && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: '#243328' },
  attribution: {
    position: 'absolute',
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  attributionText: { color: 'rgba(255,255,255,0.85)', fontSize: 9, ...font.medium },
});
