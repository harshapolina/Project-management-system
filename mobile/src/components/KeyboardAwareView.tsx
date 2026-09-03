import type { ReactNode } from 'react'
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useKeyboardInset } from '../hooks/useKeyboardInset'

type KeyboardAwareViewProps = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  /** Extra lift beyond keyboard height (e.g. sticky toolbars). */
  keyboardVerticalOffset?: number
}

/**
 * Lifts bottom-aligned inputs (chat composer, form footers) above the software keyboard.
 * Uses keyboard height inset — reliable on Android (absolute tab bar) and iOS nested stacks.
 */
export function KeyboardAwareView({
  children,
  style,
  keyboardVerticalOffset = 0,
}: KeyboardAwareViewProps) {
  const inset = useKeyboardInset()
  const { bottom: safeBottom } = useSafeAreaInsets()

  const lift =
    inset > 0 ? Math.max(0, inset - safeBottom) + keyboardVerticalOffset : 0

  if (Platform.OS === 'web') {
    return (
      <View style={[style, { flex: 1, minHeight: 0, paddingBottom: inset }]}>
        {children}
      </View>
    )
  }

  return (
    <View
      style={[
        style,
        { flex: 1, minHeight: 0 },
        lift > 0 && { paddingBottom: lift },
      ]}
    >
      {children}
    </View>
  )
}

export { useKeyboardInset }
