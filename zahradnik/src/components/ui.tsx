import Ionicons from '@expo/vector-icons/Ionicons';
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

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const colors = {
  bg: '#F3F2EA',
  surface: '#FFFFFF',
  surfaceAlt: '#ECEFE5',
  forest: '#123A29',
  primary: '#1F6644',
  primaryBright: '#3A9A63',
  primarySoft: '#DDEEDF',
  text: '#13231A',
  muted: '#6A786F',
  faint: '#A2ACA5',
  border: '#E3E5DA',
  water: '#2C7BD0',
  waterSoft: '#E1EEFB',
  sun: '#E99A2C',
  sunSoft: '#FCEFD9',
  danger: '#C4443A',
  dangerSoft: '#FAE5E2',
  frost: '#4F86E8',
  white: '#FFFFFF',
};

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

export const shadow = {
  sm: { boxShadow: '0 2px 8px rgba(18, 58, 41, 0.06)' } as ViewStyle,
  md: { boxShadow: '0 8px 24px rgba(18, 58, 41, 0.10)' } as ViewStyle,
  lg: { boxShadow: '0 16px 40px rgba(18, 58, 41, 0.18)' } as ViewStyle,
};

/** Místo pod plovoucí spodní lištou. */
export const TAB_BAR_SPACE = 118;

export function haptic(kind: 'tap' | 'success' = 'tap') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.selectionAsync().catch(() => {});
}

// ─── Typografie ─────────────────────────────────────────────

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyStrong' | 'small' | 'caption';

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.extrabold, fontSize: 44, lineHeight: 50, letterSpacing: -1.2 },
  h1: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  h2: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' },
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
  if (!onPress) return <View style={[styles.card, padded && styles.cardPad, style]}>{children}</View>;
  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        padded && styles.cardPad,
        style,
        pressed && { transform: [{ scale: 0.985 }], opacity: 0.96 },
      ]}
    >
      {children}
    </Pressable>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <T v="h2">{title}</T>
      {action && onAction && (
        <Pressable onPress={onAction} hitSlop={10}>
          <T v="bodyStrong" color={colors.primaryBright}>
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
  primary: { bg: colors.primary, fg: colors.white },
  soft: { bg: colors.primarySoft, fg: colors.primary },
  ghost: { bg: 'transparent', fg: colors.primary, border: colors.border },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  light: { bg: 'rgba(255,255,255,0.18)', fg: colors.white },
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
        { backgroundColor: c.bg, opacity: disabled ? 0.45 : 1 },
        c.border && { borderWidth: 1, borderColor: c.border },
        pressed && { transform: [{ scale: 0.97 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 19} color={c.fg} />}
          <Text style={[styles.buttonText, small && { fontSize: 14 }, { color: c.fg }]} numberOfLines={1}>
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
  tone = 'surface',
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
  const bg = tone === 'primary' ? colors.primary : tone === 'glass' ? 'rgba(255,255,255,0.92)' : colors.surface;
  const fg = tone === 'primary' ? colors.white : colors.forest;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptic();
        onPress();
      }}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        shadow.md,
        pressed && { transform: [{ scale: 0.92 }] },
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.46} color={fg} />
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
        selected && { backgroundColor: colors.forest, borderColor: colors.forest },
        pressed && { opacity: 0.8 },
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

export function Avatar({ emoji, bg = colors.primarySoft, size = 48, ring }: { emoji: string; bg?: string; size?: number; ring?: string }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: ring ? 2.5 : 0,
        borderColor: ring,
      }}
    >
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
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
    sun: { bg: colors.sunSoft, fg: '#9A5A06', icon: 'sunny' as IconName },
    water: { bg: colors.waterSoft, fg: colors.water, icon: 'water' as IconName },
    ok: { bg: colors.primarySoft, fg: colors.primary, icon: 'leaf' as IconName },
    danger: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' as IconName },
    frost: { bg: '#E5EEFD', fg: '#2F5FB8', icon: 'snow' as IconName },
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
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    marginBottom: 12,
    ...shadow.sm,
  },
  cardPad: { padding: 18 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 12,
  },
  button: {
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSmall: { minHeight: 40, borderRadius: 14, paddingHorizontal: 14 },
  buttonText: { fontFamily: fonts.bold, fontSize: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: { fontFamily: fonts.bold, fontSize: 12 },
  banner: { flexDirection: 'row', gap: 10, borderRadius: 16, padding: 12, marginTop: 10 },
  bannerText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputText: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.text, paddingVertical: 12 },
});
