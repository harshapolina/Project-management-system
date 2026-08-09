import { Image, StyleSheet, Text, View } from 'react-native'
import { colors } from '../constants/theme'
import { assetUrl } from '../constants/env'

interface AvatarProps {
  name?: string
  uri?: string | null
  size?: number
}

const PALETTE = ['#2563eb', '#7c3aed', '#0891b2', '#ea580c', '#16a34a', '#db2777', '#4f46e5']

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
  const dim = { width: size, height: size, borderRadius: size / 2 }
  const resolved = assetUrl(uri)

  if (resolved) {
    return <Image source={{ uri: resolved }} style={[styles.image, dim]} />
  }

  return (
    <View style={[styles.fallback, dim, { backgroundColor: colorForName(name || '?') }]}>
      <Text style={[styles.initials, { fontSize: Math.max(11, size * 0.38) }]} allowFontScaling={false}>
        {initials(name)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surfaceRaised },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontWeight: '700' },
})
