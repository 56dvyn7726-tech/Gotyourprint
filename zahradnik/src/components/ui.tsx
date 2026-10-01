import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Barvy vychází ze systémové palety iOS (systemGreen, systemBlue…).
export const colors = {
  bg: '#EEF3EC',
  surface: 'rgba(255,255,255,0.62)',
  surfaceSolid: '#FFFFFF',
  surfaceAlt: 'rgba(120,120,128,0.12)',
  forest: '#1C3B2A',
  primary: '#248A3D',
  primaryBright: '#34C759',
  primarySoft: 'rgba(52,199,89,0.16)',
  text: '#1C1C1E',
  muted: 'rgba(60,60,67,0.62)',
  faint: 'rgba(60,60,67,0.32)',
  border: 'rgba(255,255,255,0.75)',
  separator: 'rgba(60,60,67,0.14)',
  water: '#007AFF',
  waterSoft: 'rgba(0,122,255,0.12)',
  sun: '#FF9500',
  sunSoft: 'rgba(255,149,0,0.14)',
  danger: '#FF3B30',
  dangerSoft: 'rgba(255,59,48,0.12)',
  frost: '#5AC8FA',
  purple: '#AF52DE',
  purpleSoft: 'rgba(175,82,222,0.12)',
  white: '#FFFFFF',
};

// Systémové písmo: SF Pro na iPhonu a Macu, Roboto na Androidu.
const SYSTEM_FONT = Platform.select({
  ios: 'System',
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", "Segoe UI", Roboto, sans-serif',
  default: undefined,
});

export const font = {
  regular: { fontFamily: SYSTEM_FONT, fontWeight: '400' },
  medium: { fontFamily: SYSTEM_FONT, fontWeight: '500' },
  semibold: { fontFamily: SYSTEM_FONT, fontWeight: '600' },
  bold: { fontFamily: SYSTEM_FONT, fontWeight: '700' },
  extrabold: { fontFamily: SYSTEM_FONT, fontWeight: '800' },
} satisfies Record<string, TextStyle>;

export const shadow = {
  sm: { boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(20,60,40,0.06)' } as ViewStyle,
  md: { boxShadow: '0 2px 6px rgba(0,0,0,0.05), 0 10px 30px rgba(20,60,40,0.10)' } as ViewStyle,
  lg: { boxShadow: '0 4px 10px rgba(0,0,0,0.06), 0 20px 50px rgba(20,60,40,0.18)' } as ViewStyle,
};

/** Místo pod plovoucí spodní lištou. */
export const TAB_BAR_SPACE = 118;

export function haptic(kind: 'tap' | 'success' = 'tap') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.selectionAsync().catch(() => {});
}

// ─── Sklo a pozadí ──────────────────────────────────────────

/**
 * Průhledný „skleněný“ panel: rozmaže, co je pod ním, a přidá světlý lesk a jemný okraj.
 * Na webu se použije CSS backdrop-filter, na Androidu nativní rozmazání.
 */
export function Glass({
  children,
  style,
  intensity = 40,
  tint = 'light',
  radius = 26,
  tone = 'light',
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default' | 'systemMaterialLight' | 'systemThinMaterialLight' | 'systemUltraThinMaterialLight';
  radius?: number;
  /** 'light' = mléčné sklo, 'clear' = skoro čiré (nad mapou), 'dark' = kouřové. */
  tone?: 'light' | 'clear' | 'dark';
}) {
  const overlay = tone === 'dark' ? 'rgba(20,30,25,0.35)' : tone === 'clear' ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.52)';
  const border = tone === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.8)';
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, shadow.sm, style]}>
      <BlurView
        intensity={intensity}
        tint={tone === 'dark' ? 'dark' : tint}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay, borderRadius: radius, borderWidth: 1, borderColor: border }]} />
      {/* Lesk na horní hraně skla */}
      <LinearGradient
        pointerEvents="none"
        colors={tone === 'dark' ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']}
        style={[styles.sheen, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
      />
      {children}
    </View>
  );
}

/** Barevné „aurora“ pozadí aplikace, které prosvítá skleněnými panely. */
export function Backdrop({ style }: { style?: StyleProp<ViewStyle> }) {
  // Souřadnice jsou zlomky plochy (0–1), takže se pozadí přizpůsobí každé obrazovce.
  const blobs = [
    { id: 'a', cx: 0.05, cy: 0.05, r: 0.6, color: '#8EE0A8' },
    { id: 'b', cx: 1.0, cy: 0.18, r: 0.55, color: '#9CD2FF' },
    { id: 'c', cx: 0.1, cy: 0.62, r: 0.6, color: '#D3F0A4' },
    { id: 'd', cx: 0.95, cy: 0.88, r: 0.6, color: '#A9E6DA' },
    { id: 'e', cx: 0.55, cy: 0.38, r: 0.45, color: '#FFEFC2' },
  ];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          {blobs.map((b) => (
            <RadialGradient key={b.id} id={b.id} cx={b.cx} cy={b.cy} r={b.r} fx={b.cx} fy={b.cy}>
              <Stop offset="0" stopColor={b.color} stopOpacity={0.95} />
              <Stop offset="1" stopColor={b.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {blobs.map((b) => (
          <Rect key={b.id} x="0" y="0" width="100" height="100" fill={`url(#${b.id})`} />
        ))}
      </Svg>
    </View>
  );
}

// ─── Typografie ─────────────────────────────────────────────

type Variant = 'largeTitle' | 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'small' | 'caption';

const VARIANTS: Record<Variant, TextStyle> = {
  largeTitle: { ...font.bold, fontSize: 34, lineHeight: 41, letterSpacing: 0.37 },
  display: { ...font.regular, fontSize: 64, lineHeight: 70, letterSpacing: -1.5 },
  h1: { ...font.bold, fontSize: 28, lineHeight: 34, letterSpacing: 0.36 },
  h2: { ...font.bold, fontSize: 22, lineHeight: 28, letterSpacing: 0.35 },
  h3: { ...font.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.41 },
  body: { ...font.regular, fontSize: 17, lineHeight: 22, letterSpacing: -0.41 },
  bodyStrong: { ...font.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.41 },
  small: { ...font.regular, fontSize: 15, lineHeight: 20, letterSpacing: -0.24 },
  caption: { ...font.semibold, fontSize: 13, lineHeight: 18, letterSpacing: -0.08, textTransform: 'uppercase' },
};

export function T({
  v = 'body',
  color,
  style,
  ...rest
}: TextProps & { v?: Variant; color?: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text
      {...rest}
      style={[VARIANTS[v], { color: color ?? (v === 'small' || v === 'caption' ? colors.muted : colors.text) }, style]}
    />
  );
}

// ─── Kontejnery ─────────────────────────────────────────────

const INNER_KEYS = new Set([
  'flexDirection', 'alignItems', 'justifyContent', 'flexWrap', 'gap', 'rowGap', 'columnGap',
  'padding', 'paddingVertical', 'paddingHorizontal', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
]);

export function Card({
  children,
  style,
  onPress,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}) {
  // Rozvržení obsahu (flex, odsazení) patří dovnitř skla, zbytek (okraje, šířka, pozadí) ven.
  const { backgroundColor, ...rest } = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  const inner: ViewStyle = padded ? { padding: 18 } : {};
  const outer: ViewStyle = {};
  for (const [k, v] of Object.entries(rest)) {
    const key = k as keyof ViewStyle;
    if (INNER_KEYS.has(k)) (inner as any)[key] = v;
    else (outer as any)[key] = v;
  }
  const content = <View style={inner}>{children}</View>;
  const body = backgroundColor ? (
    <View style={[styles.card, styles.tinted, { backgroundColor }, outer]}>{content}</View>
  ) : (
    <Glass style={[styles.card, outer]}>{content}</Glass>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress();
      }}
      style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}
    >
      {body}
    </Pressable>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <T v="h2">{title}</T>
      {action && onAction && (
        <Pressable onPress={onAction} hitSlop={10}>
          <T v="body" color={colors.water}>
            {action}
          </T>
        </Pressable>
      )}
    </View>
  );
}

// ─── Ovládací prvky ─────────────────────────────────────────

type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'danger' | 'light';

const BUTTON: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primaryBright, fg: colors.white },
  soft: { bg: 'rgba(52,199,89,0.16)', fg: colors.primary },
  ghost: { bg: 'rgba(255,255,255,0.55)', fg: colors.text, border: 'rgba(255,255,255,0.9)' },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  light: { bg: 'rgba(255,255,255,0.25)', fg: colors.white, border: 'rgba(255,255,255,0.4)' },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = BUTTON[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        haptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: c.bg, opacity: disabled ? 0.4 : 1 },
        c.border && { borderWidth: 1, borderColor: c.border },
        variant === 'primary' && { boxShadow: '0 6px 18px rgba(52,199,89,0.35)' },
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 17 : 20} color={c.fg} />}
          <Text style={[styles.buttonText, small && { fontSize: 15 }, { color: c.fg }]} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  tone = 'glass',
  size = 44,
  style,
  label,
}: {
  icon: IconName;
  onPress: () => void;
  tone?: 'surface' | 'primary' | 'glass';
  size?: number;
  style?: StyleProp<ViewStyle>;
  label?: string;
}) {
  const fg = tone === 'primary' ? colors.white : colors.text;
  const content = <Ionicons name={icon} size={size * 0.45} color={fg} />;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic();
        onPress();
      }}
      style={({ pressed }) => [pressed && { transform: [{ scale: 0.9 }] }, style]}
    >
      {tone === 'primary' ? (
        <View
          style={[
            { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryBright, alignItems: 'center', justifyContent: 'center' },
            { boxShadow: '0 6px 18px rgba(52,199,89,0.4)' },
          ]}
        >
          {content}
        </View>
      ) : (
        <Glass radius={size / 2} intensity={50} style={[{ width: size, height: size }, shadow.md]}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{content}</View>
        </Glass>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptic();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: colors.text, borderColor: colors.text },
        pressed && { opacity: 0.75 },
      ]}
    >
      {icon && <Ionicons name={icon} size={15} color={selected ? colors.white : colors.primary} />}
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ label, color, bg, icon }: { label: string; color: string; bg: string; icon?: IconName }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={13} color={color} />}
      <Text style={[styles.pillText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function Avatar({ emoji, bg = 'rgba(255,255,255,0.7)', size = 48, ring }: { emoji: string; bg?: string; size?: number; ring?: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: ring ? 2.5 : 1,
        borderColor: ring ?? 'rgba(255,255,255,0.9)',
      }}
    >
      <Text style={{ fontSize: size * 0.52 }}>{emoji}</Text>
    </View>
  );
}

export function Banner({
  children,
  tone = 'sun',
  icon,
}: {
  children: React.ReactNode;
  tone?: 'sun' | 'water' | 'ok' | 'danger' | 'frost';
  icon?: IconName;
}) {
  const map = {
    sun: { bg: colors.sunSoft, fg: '#B25E00', icon: 'sunny' as IconName },
    water: { bg: colors.waterSoft, fg: colors.water, icon: 'water' as IconName },
    ok: { bg: colors.primarySoft, fg: colors.primary, icon: 'leaf' as IconName },
    danger: { bg: colors.dangerSoft, fg: '#C4291F', icon: 'alert-circle' as IconName },
    frost: { bg: 'rgba(90,200,250,0.16)', fg: '#0A6FA8', icon: 'snow' as IconName },
  }[tone];
  return (
    <View style={[styles.banner, { backgroundColor: map.bg }]}>
      <Ionicons name={icon ?? map.icon} size={18} color={map.fg} style={{ marginTop: 1 }} />
      <Text style={[styles.bannerText, { color: map.fg }]}>{children}</Text>
    </View>
  );
}

export function Input({ icon, style, ...rest }: TextInputProps & { icon?: IconName }) {
  return (
    <View style={[styles.input, style as ViewStyle]}>
      {icon && <Ionicons name={icon} size={18} color={colors.muted} />}
      <TextInput placeholderTextColor={colors.faint} {...rest} style={styles.inputText} />
    </View>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginVertical: 12 }} />;
}

const styles = StyleSheet.create({
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '60%',
  },
  card: { marginBottom: 12 },
  tinted: { borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', overflow: 'hidden' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  button: {
    minHeight: 52,
    borderRadius: 999,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSmall: { minHeight: 42, paddingHorizontal: 16 },
  buttonText: { ...font.semibold, fontSize: 17, letterSpacing: -0.41 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(255,255,255,0.55)',
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { ...font.medium, fontSize: 15, color: colors.text },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: { ...font.semibold, fontSize: 13 },
  banner: { flexDirection: 'row', gap: 10, borderRadius: 16, padding: 12, marginTop: 10 },
  bannerText: { flex: 1, ...font.regular, fontSize: 15, lineHeight: 20 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 14,
    minHeight: 48,
  },
  inputText: { flex: 1, ...font.regular, fontSize: 17, color: colors.text, paddingVertical: 12 },
});
