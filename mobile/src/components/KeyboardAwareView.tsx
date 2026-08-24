import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, View, type StyleProp, type ViewStyle } from 'react-native'
import { useKeyboardInset } from '../hooks/useKeyboardInset'

type KeyboardAwareViewProps = {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  /** iOS only — offset for nav bars / tab bars. */
  keyboardVerticalOffset?: number
}

/**
 * Keeps bottom inputs (login, chat composer, form footers) above the software keyboard.
 * Web uses visualViewport padding; native uses KeyboardAvoidingView.
 */
export function KeyboardAwareView({
  children,
  style,
  keyboardVerticalOffset = 0,
}: KeyboardAwareViewProps) {
  const inset = useKeyboardInset()

  if (Platform.OS === 'web') {
    return (
      <View style={[style, { flex: 1, paddingBottom: inset }]}>
        {children}
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[style, { flex: 1 }]}
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {children}
    </KeyboardAvoidingView>
  )
}

export { useKeyboardInset }
