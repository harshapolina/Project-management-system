import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { colors, shadows, typography } from '../constants/theme'

const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap; label: string }> = {
  Home: { on: 'checkmark-circle', off: 'checkmark-circle-outline', label: 'Work' },
  Projects: { on: 'folder', off: 'folder-outline', label: 'Projects' },
  Inbox: { on: 'chatbubble', off: 'chatbubble-outline', label: 'Inbox' },
  More: { on: 'grid', off: 'grid-outline', label: 'More' },
}

export const TAB_BAR_CLEARANCE = 98

export function GlassyTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()

  return (
    <View pointerEvents="box-none" style={[styles.dock, { bottom: Math.max(insets.bottom, 8) + 4 }]}>
      <View style={styles.pill}>
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFill, styles.webFill]} />
        ) : (
          <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.glassTint} />
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const focused = state.index === index
            const meta = ICONS[route.name] || ICONS.More
            const label = meta.label

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              })
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params)
              }
            }

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                style={styles.item}
              >
                <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                  <Ionicons
                    name={focused ? meta.on : meta.off}
                    size={20}
                    color={focused ? colors.accent : colors.textMuted}
                  />
                </View>
                <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  pill: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.7)',
    ...shadows.floating,
  },
  webFill: {
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  glassTint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(37,99,235,0.12)',
  },
  label: {
    ...typography.micro,
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.accent,
  },
})
