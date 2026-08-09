import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '../constants/theme'

interface ScreenProps {
  children: ReactNode
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
  padded?: boolean
  keyboardAvoiding?: boolean
  background?: string
}

/**
 * Base screen shell: safe-area aware, never a fixed width/height so it
 * behaves the same from an iPhone SE up to an iPad. Screens that render
 * their own FlatList pass edges=['top','left','right'] and let the list
 * handle bottom inset via contentContainerStyle so pull-to-refresh isn't
 * fighting a KeyboardAvoidingView.
 */
export function Screen({
  children,
  edges = ['top', 'left', 'right', 'bottom'],
  padded = true,
  keyboardAvoiding = false,
  background = colors.canvas,
}: ScreenProps) {
  const content = (
    <View style={[styles.flex, padded && styles.padded]}>{children}</View>
  )

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: background }]}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg },
})
