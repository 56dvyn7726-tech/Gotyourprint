import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner, Button, Card, Chip, colors, fonts, IconName, Input, T, TAB_BAR_SPACE } from '../../components/ui';
import { getPlant } from '../../data/plants';
import { Diagnosis, diagnosePhoto, explainError } from '../../lib/diagnose';
import { confirmAsk, notify } from '../../lib/dialog';
import { downscaleInBrowser } from '../../lib/downscale';
import { useStore } from '../../lib/store';

type MediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

// API přijímá obrázky do 5 MB; base64 je o třetinu větší než binární data.
const MAX_BASE64 = Math.floor(5 * 1024 * 1024 * 1.33);

export default function DiagnoseScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ plantId?: string }>();
  const { garden, settings, weather } = useStore();
  const [plantId, setPlantId] = useState<string | undefined>(params.plantId);
  const [photo, setPhoto] = useState<{ uri: string; base64: string; mediaType: MediaType } | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (params.plantId) setPlantId(params.plantId);
  }, [params.plantId]);

  const myPlantIds = Array.from(new Set(garden.plants.map((p) => p.plantId)));

  const pick = async (fromCamera: boolean) => {
    const perm = fromCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify('Chybí oprávnění', fromCamera ? 'Povol přístup k fotoaparátu v nastavení telefonu.' : 'Povol přístup k fotkám v nastavení telefonu.');
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.5, base64: true };
    const res = fromCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (res.canceled || !res.assets[0]?.base64) return;
    const asset = res.assets[0];
    const mt = asset.mimeType as MediaType | undefined;
    let base64 = asset.base64!;
    let mediaType: MediaType = mt && ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mt) ? mt : 'image/jpeg';
    if (Platform.OS === 'web') {
      try {
        ({ base64, mediaType } = await downscaleInBrowser(base64, mediaType));
      } catch {
        // Formát, který prohlížeč neumí načíst (např. HEIC) – pošleme originál.
      }
    }
    if (base64.length > MAX_BASE64) {
      notify('Fotka je moc velká', 'Zkus ji vyfotit znovu nebo vybrat menší.');
      return;
    }
    setPhoto({ uri: asset.uri, base64, mediaType });
    setResult(null);
    setError(null);
  };

  const analyze = async () => {
    if (!photo) return;
    if (!settings.apiKey) {
      const go = await confirmAsk(
        'Chybí API klíč',
        'Pro rozpoznání problému z fotky zadej v Nastavení svůj Anthropic API klíč. Přejít do Nastavení?',
        'Nastavení',
      );
      if (go) router.push('/nastaveni');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const d = await diagnosePhoto({
        apiKey: settings.apiKey,
        base64: photo.base64,
        mediaType: photo.mediaType,
        plant: plantId ? getPlant(plantId) : undefined,
        note,
        garden,
        weather,
      });
      setResult(d);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    } catch (e) {
      setError(explainError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }} keyboardShouldPersistTaps="handled">
        <LinearGradient colors={['#2A1F4F', '#5B3F9E', '#8A63D2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <T v="caption" color="rgba(255,255,255,0.7)">
            Poradna
          </T>
          <T v="h1" color={colors.white}>
            Co jí je? 🔍
          </T>
          <T v="body" color="rgba(255,255,255,0.85)" style={{ marginTop: 6 }}>
            Vyfoť nemocnou rostlinu – skvrny, žloutnutí, škůdce, vadnutí. Zaostři na postižené místo za denního světla.
          </T>
          {!photo && (
            <View style={styles.pickRow}>
              <Pressable onPress={() => pick(true)} style={({ pressed }) => [styles.pickBig, pressed && { transform: [{ scale: 0.97 }] }]}>
                <View style={styles.pickIcon}>
                  <Ionicons name="camera" size={30} color="#5B3F9E" />
                </View>
                <Text style={styles.pickText}>Vyfotit</Text>
              </Pressable>
              <Pressable onPress={() => pick(false)} style={({ pressed }) => [styles.pickSmall, pressed && { transform: [{ scale: 0.97 }] }]}>
                <Ionicons name="images" size={26} color={colors.white} />
                <Text style={[styles.pickText, { color: colors.white }]}>Z galerie</Text>
              </Pressable>
            </View>
          )}
        </LinearGradient>

        <View style={styles.body}>
          {photo && (
            <Animated.View entering={FadeIn}>
              <View style={styles.photoWrap}>
                <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" />
                <Pressable
                  onPress={() => {
                    setPhoto(null);
                    setResult(null);
                  }}
                  style={styles.photoClose}
                  accessibilityLabel="Odebrat fotku"
                >
                  <Ionicons name="close" size={20} color={colors.white} />
                </Pressable>
                <Pressable onPress={() => pick(true)} style={styles.photoRetake}>
                  <Ionicons name="camera-reverse" size={16} color={colors.white} />
                  <Text style={styles.photoRetakeText}>Jiná fotka</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {myPlantIds.length > 0 && (
            <>
              <T v="h3" style={{ marginTop: 18, marginBottom: 10 }}>
                O jakou rostlinu jde?
              </T>
              <View style={styles.wrap}>
                <Chip label="Nevím" icon="help" selected={!plantId} onPress={() => setPlantId(undefined)} />
                {myPlantIds.map((id) => {
                  const p = getPlant(id);
                  return p ? <Chip key={id} label={`${p.emoji} ${p.name}`} selected={plantId === id} onPress={() => setPlantId(id)} /> : null;
                })}
              </View>
            </>
          )}

          {photo && (
            <>
              <Input
                icon="chatbubble-ellipses-outline"
                value={note}
                onChangeText={setNote}
                placeholder="Co pozoruješ? (např. listy žloutnou odspodu)"
                multiline
                style={{ marginTop: 14 }}
              />
              <Button title={loading ? 'Prohlížím fotku…' : 'Zjistit, co jí je'} icon="sparkles" onPress={analyze} loading={loading} style={{ marginTop: 14 }} />
              {loading && (
                <T v="small" style={{ textAlign: 'center', marginTop: 8 }}>
                  Může to trvat pár desítek sekund.
                </T>
              )}
            </>
          )}

          {error && <Banner tone="danger">{error}</Banner>}
          {result && <DiagnosisView d={result} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const CONFIDENCE = { nízká: 1, střední: 2, vysoká: 3 } as const;

function DiagnosisView({ d }: { d: Diagnosis }) {
  const level = CONFIDENCE[d.jistota] ?? 1;
  const tone = level === 3 ? colors.primaryBright : level === 2 ? colors.sun : colors.danger;
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={{ marginTop: 18 }}>
      <Card>
        <T v="caption">{d.rostlina}</T>
        <T v="h2" style={{ marginTop: 4 }}>
          {d.problem}
        </T>
        <View style={styles.confRow}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.confSeg, { backgroundColor: i <= level ? tone : colors.surfaceAlt }]} />
          ))}
          <Text style={[styles.confText, { color: tone }]}>jistota {d.jistota}</Text>
        </View>
        <T v="body" style={{ marginTop: 10 }}>
          {d.popis}
        </T>
      </Card>
      <Section title="Co udělat hned" icon="checkmark-circle" color={colors.primaryBright} items={d.co_delat_hned} />
      <Section title="Možné příčiny" icon="search" color={colors.water} items={d.priciny} />
      <Section title="Prevence" icon="shield-checkmark" color="#7A45A0" items={d.dlouhodobe} />
      <Banner tone="sun" icon="warning">
        {d.kdy_zpozornet}
      </Banner>
      <T v="small" style={{ textAlign: 'center', marginTop: 12 }}>
        Diagnóza z fotky je orientační – při vážném problému se poraď v zahradnictví.
      </T>
    </Animated.View>
  );
}

function Section({ title, icon, color, items }: { title: string; icon: IconName; color: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Ionicons name={icon} size={20} color={color} />
        <T v="h3">{title}</T>
      </View>
      {items.map((it, i) => (
        <View key={i} style={styles.item}>
          <View style={[styles.bullet, { backgroundColor: color }]} />
          <T v="body" style={{ flex: 1 }}>
            {it}
          </T>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 28, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  pickRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  pickBig: { flex: 1.4, backgroundColor: colors.white, borderRadius: 24, padding: 18, gap: 10 },
  pickIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#EDE6FA', alignItems: 'center', justifyContent: 'center' },
  pickSmall: { flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 24, padding: 18, gap: 10, justifyContent: 'flex-end' },
  pickText: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  body: { paddingHorizontal: 16, paddingTop: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  photoWrap: { borderRadius: 28, overflow: 'hidden', backgroundColor: colors.border },
  photo: { width: '100%', aspectRatio: 4 / 3 },
  photoClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRetake: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  photoRetakeText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 13 },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  confSeg: { width: 28, height: 6, borderRadius: 3 },
  confText: { fontFamily: fonts.bold, fontSize: 12, marginLeft: 6 },
  item: { flexDirection: 'row', gap: 10, marginTop: 6 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
});
