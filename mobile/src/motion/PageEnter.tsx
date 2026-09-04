import { useEffect, useRef, type ReactNode } from 'react'
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { EASE_APPLE, MOTION, nativeDriver } from './tokens'
import { useReducedMotion } from './useReducedMotion'

/**
 * Subtle page-body enter: opacity + 8–10px horizontal.
 * Header chrome stays outside this wrapper so back buttons stay planted.
 */
export function PageEnter({
  children,
  style,
  axis = 'x',
  distance = 10,
  fill = true,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  axis?: 'x' | 'y'
  distance?: number
  fill?: boolean
}) {
  const reduced = useReducedMotion()
  const opacity = useRef(new Animated.Value(reduced ? 1 : 0)).current
  const offset = useRef(new Animated.Value(reduced ? 0 : distance)).current

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1)
      offset.setValue(0)
      return
    }
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: MOTION.page,
        easing: EASE_APPLE,
        useNativeDriver: nativeDriver,
      }),
      Animated.timing(offset, {
        toValue: 0,
        duration: MOTION.page,
        easing: EASE_APPLE,
        useNativeDriver: nativeDriver,
      }),
    ])
    anim.start()
    return () => anim.stop()
  }, [opacity, offset, reduced])

  const fillStyle = fill ? styles.fill : undefined

  if (reduced) {
    return <View style={[fillStyle, style]}>{children}</View>
  }

  return (
    <Animated.View
      style={[
        fillStyle,
        { opacity, transform: axis === 'y' ? [{ translateY: offset }] : [{ translateX: offset }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
})
