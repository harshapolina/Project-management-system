import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useColors } from '../theme/useColors'
import { useResponsive } from '../theme/useResponsive'

interface ScreenProps {
  children: ReactNode
  edges?: ('top' | 'bottom' | 'left' | 'right')[]
  padded?: boolean
  keyboardAvoiding?: boolean
  background?: string
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
}: ScreenProps) {
  const colors = useColors()
  const { pagePadding, contentMaxWidth, isTablet } = useResponsive()
  const bg = background ?? colors.canvas

  const content = (
    <View
      style={[
        styles.flex,
        padded && { paddingHorizontal: pagePadding },
        isTablet && contentMaxWidth
          ? { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' }
          : null,
      ]}
    >
      {children}
    </View>
  )

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: bg }]}>
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
})
