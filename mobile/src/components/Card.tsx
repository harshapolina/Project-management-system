import { StyleSheet, View, type ViewProps } from 'react-native'
import { colors, radius, shadows, spacing } from '../constants/theme'

export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    width: '100%',
    ...shadows.card,
  },
})
