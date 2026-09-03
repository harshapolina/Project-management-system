import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KeyboardAwareView } from './KeyboardAwareView'
import { useColors } from '../theme/useColors'
import { useResponsive } from '../theme/useResponsive'

interface ScreenProps {
  children: ReactNode
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
  padded?: boolean
  keyboardAvoiding?: boolean
  background?: string
  /** Stack nested screen: side edges only, standard list padding when scroll */
  variant?: 'default' | 'stack'
  scroll?: boolean
  contentContainerStyle?: StyleProp<ViewStyle>
}

/**
 * Base screen shell: safe-area aware, fluid width from iPhone SE to tablet.
 * On tablets, content is centered with a max width so cards don’t stretch endlessly.
 */
export function Screen({
  children,
  edges = ['top', 'left', 'right', 'bottom'],
  padded = true,
  keyboardAvoiding = false,
  background,
  variant = 'default',
  scroll = false,
  contentContainerStyle,
}: ScreenProps) {
  const colors = useColors()
  const { pagePadding, contentMaxWidth, isTablet, listContent } = useResponsive()
  const bg = background ?? colors.canvas
  const resolvedEdges = variant === 'stack' ? (['left', 'right'] as const) : edges

  const inner = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[variant === 'stack' ? listContent : null, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    children
  )

  const content = (
    <View
      style={[
        styles.flex,
        styles.column,
        padded && variant !== 'stack' && { paddingHorizontal: pagePadding },
        isTablet && contentMaxWidth
          ? { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }
          : null,
      ]}
    >
      {inner}
    </View>
  )

  const body = keyboardAvoiding ? (
    <KeyboardAwareView style={styles.flex}>{content}</KeyboardAwareView>
  ) : (
    content
  )

  return (
    <SafeAreaView edges={[...resolvedEdges]} style={[styles.flex, { backgroundColor: bg }]}>
      {body}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  column: { flexDirection: 'column' },
})
