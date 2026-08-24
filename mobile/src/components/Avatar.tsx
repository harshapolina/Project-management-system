import { useMemo } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { useColors } from '../theme/useColors'
import { assetUrl } from '../constants/env'

interface AvatarProps {
  name?: string
  uri?: string | null
  size?: number
}

/** Emerald-leaning palette (matches web accent system) */
const PALETTE = ['#3ecf8e', '#24b47e', '#34d399', '#71717a', '#eab308', '#18181b', '#a1a1aa']

function colorForName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

function initials(name?: string) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export function Avatar({ name = '', uri, size = 36 }: AvatarProps) {
  const colors = useColors()
  const styles = useMemo(
    () =>
      StyleSheet.create({
        image: { backgroundColor: colors.surfaceRaised },
        fallback: { alignItems: 'center', justifyContent: 'center' },
        initials: { color: colors.textOnAccent, fontWeight: '700' },
      }),
    [colors],
  )
  const dim = { width: size, height: size, borderRadius: size / 2 }
  const resolved = assetUrl(uri)
  const bg = colorForName(name || '?')
  const initialColor =
    bg === '#18181b' || bg === '#71717a' ? colors.textPrimary : colors.textOnAccent

  if (resolved) {
    return <Image source={{ uri: resolved }} style={[styles.image, dim]} />
  }

  return (
    <View style={[styles.fallback, dim, { backgroundColor: bg }]}>
      <Text
        style={[styles.initials, { fontSize: Math.max(11, size * 0.38), color: initialColor }]}
        allowFontScaling={false}
      >
        {initials(name)}
      </Text>
    </View>
  )
}
