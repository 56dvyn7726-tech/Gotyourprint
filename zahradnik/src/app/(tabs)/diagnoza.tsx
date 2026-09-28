import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Banner, Button, Card, Chip, colors, Muted, SectionTitle } from '../../components/ui';
import { getPlant } from '../../data/plants';
import { Diagnosis, diagnosePhoto, explainError } from '../../lib/diagnose';
import { confirmAsk, notify } from '../../lib/dialog';
import { downscaleInBrowser } from '../../lib/downscale';
import { useStore } from '../../lib/store';

type MediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

// API přijímá obrázky do 5 MB; base64 je o třetinu větší než binární data.
const MAX_BASE64 = Math.floor(5 * 1024 * 1024 * 1.33);

export default function DiagnoseScreen() {
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
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
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
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setError(explainError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Muted>
          Vyfoť rostlinu, která má problém (skvrny, žloutnutí, škůdce, vadnutí…). Zaostři na postiženou část, ideálně za
          denního světla.
        </Muted>

        {myPlantIds.length > 0 && (
          <>
            <SectionTitle>O jakou rostlinu jde?</SectionTitle>
            <View style={styles.wrap}>
              <Chip label="Nevím / jiná" selected={!plantId} onPress={() => setPlantId(undefined)} />
              {myPlantIds.map((id) => {
                const p = getPlant(id);
                return p ? <Chip key={id} label={`${p.emoji} ${p.name}`} selected={plantId === id} onPress={() => setPlantId(id)} /> : null;
              })}
            </View>
          </>
        )}

        <View style={styles.buttons}>
          <Button title="📷 Vyfotit" onPress={() => pick(true)} style={{ flex: 1 }} />
          <Button title="🖼️ Z galerie" variant="secondary" onPress={() => pick(false)} style={{ flex: 1 }} />
        </View>

        {photo && (
          <>
            <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Co pozoruješ? (volitelné, např. „listy žloutnou odspodu“)"
              placeholderTextColor={colors.muted}
              style={styles.input}
              multiline
            />
            <Button title="Co jí je?" onPress={analyze} loading={loading} style={{ marginTop: 12 }} />
            {loading && <Muted style={{ marginTop: 8, textAlign: 'center' }}>Prohlížím fotku… může to chvilku trvat.</Muted>}
          </>
        )}

        {error && <Banner>{error}</Banner>}
        {result && <DiagnosisView d={result} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DiagnosisView({ d }: { d: Diagnosis }) {
  const tone = d.jistota === 'vysoká' ? colors.primaryDark : d.jistota === 'střední' ? colors.warn : colors.danger;
  return (
    <View style={{ marginTop: 16 }}>
      <Card>
        <Muted>{d.rostlina}</Muted>
        <Text style={styles.title}>{d.problem}</Text>
        <Text style={{ color: tone, fontWeight: '600', marginTop: 2 }}>Jistota: {d.jistota}</Text>
        <Text style={styles.body}>{d.popis}</Text>
      </Card>
      <List title="Co udělat hned" icon="✅" items={d.co_delat_hned} />
      <List title="Možné příčiny" icon="🔎" items={d.priciny} />
      <List title="Prevence do budoucna" icon="🛡️" items={d.dlouhodobe} />
      <Card style={{ backgroundColor: colors.warnSoft }}>
        <Text style={[styles.body, { color: colors.warn, marginTop: 0 }]}>⚠️ {d.kdy_zpozornet}</Text>
      </Card>
      <Muted style={{ textAlign: 'center' }}>Diagnóza z fotky je orientační – při vážném problému se poraď v zahradnictví.</Muted>
    </View>
  );
}

function List({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <Card>
        {items.map((it, i) => (
          <Text key={i} style={styles.item}>
            {icon} {it}
          </Text>
        ))}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 60 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 16 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 16, marginTop: 16, backgroundColor: colors.border },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginTop: 12,
    minHeight: 60,
    color: colors.text,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 2 },
  body: { fontSize: 15, lineHeight: 22, color: colors.text, marginTop: 8 },
  item: { fontSize: 15, lineHeight: 22, color: colors.text, marginBottom: 6 },
});
