import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { Button } from '../../components/Button'
import { radius, spacing, typography } from '../../constants/theme'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProfileStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProfileStackParamList, 'CropAvatar'>

/** Zoom bounds. 1 is "fills the frame"; past 4x a phone photo turns to mush. */
const MIN_SCALE = 1
const MAX_SCALE = 4

/**
 * Side of the saved avatar, in pixels. Larger than anywhere it's displayed
 * (88pt at 3x ≈ 264) so it stays sharp on a big screen, small enough that the
 * upload is quick.
 */
const OUTPUT_SIZE = 512

/** The editor is always dark — a neutral surround is how you judge a crop. */
const BACKDROP = '#0d0d0f'
const MASK = 'rgba(13, 13, 15, 0.72)'

type Source = { uri: string; width: number; height: number }

/**
 * Square-crop editor for a profile photo.
 *
 * The system picker's `allowsEditing` crop was doing this job, but it hands off
 * to whatever cropper the OS ships — different on every Android skin, and with
 * no zoom on some. Doing it in-app means one predictable editor, and the circle
 * mask shows the avatar exactly as it will appear rather than leaving the user
 * to guess what a square becomes.
 */
export function CropAvatarScreen({ navigation, route }: Props) {
  const { uri } = route.params
  const insets = useSafeAreaInsets()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()

  const [source, setSource] = useState<Source | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  /**
   * The crop window. Square because the avatar is, and sized to leave room for
   * the controls on a short screen rather than assuming a tall phone.
   */
  const frame = Math.min(
    windowWidth - spacing.lg * 2,
    windowHeight - insets.top - insets.bottom - 280,
  )

  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const tx = useSharedValue(0)
  const ty = useSharedValue(0)
  const savedTx = useSharedValue(0)
  const savedTy = useSharedValue(0)

  /**
   * Scale that makes the image cover the frame. Everything else is expressed
   * as a multiple of this, so `scale === 1` always means "no empty gutters".
   */
  const base = source ? Math.max(frame / source.width, frame / source.height) : 1
  const fittedWidth = source ? source.width * base : 0
  const fittedHeight = source ? source.height * base : 0

  const resetTransform = () => {
    scale.value = withTiming(1)
    savedScale.value = 1
    tx.value = withTiming(0)
    ty.value = withTiming(0)
    savedTx.value = 0
    savedTy.value = 0
  }

  /** Read the real pixel size once — the crop maths is meaningless without it. */
  useEffect(() => {
    let alive = true
    ImageManipulator.manipulate(uri)
      .renderAsync()
      .then((rendered) => {
        if (!alive) return
        setSource({ uri, width: rendered.width, height: rendered.height })
      })
      .catch(() => {
        if (alive) setError("That image couldn't be opened. Try another one.")
      })
    return () => {
      alive = false
    }
  }, [uri])

  /**
   * Keep the frame covered. Panning past an edge would expose background that
   * would then be baked into the avatar as a transparent or black wedge.
   */
  const clampTranslation = (nextScale: number) => {
    'worklet'
    const maxX = Math.max(0, (fittedWidth * nextScale - frame) / 2)
    const maxY = Math.max(0, (fittedHeight * nextScale - frame) / 2)
    tx.value = withTiming(Math.min(maxX, Math.max(-maxX, tx.value)))
    ty.value = withTiming(Math.min(maxY, Math.max(-maxY, ty.value)))
    savedTx.value = Math.min(maxX, Math.max(-maxX, tx.value))
    savedTy.value = Math.min(maxY, Math.max(-maxY, ty.value))
  }

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = savedTx.value + e.translationX
      ty.value = savedTy.value + e.translationY
    })
    .onEnd(() => {
      clampTranslation(scale.value)
    })

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, savedScale.value * e.scale),
      )
    })
    .onEnd(() => {
      savedScale.value = scale.value
      clampTranslation(scale.value)
    })

  /** Double tap toggles between fit and a 2x look, the usual photo-viewer gesture. */
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const next = scale.value > 1.05 ? 1 : 2
      scale.value = withTiming(next)
      savedScale.value = next
      if (next === 1) {
        tx.value = withTiming(0)
        ty.value = withTiming(0)
        savedTx.value = 0
        savedTy.value = 0
      } else {
        clampTranslation(next)
      }
    })

  const gesture = Gesture.Simultaneous(pan, pinch, doubleTap)

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }))

  /**
   * Rotation is baked into a new working image rather than added to the live
   * transform. Rotating the preview instead would mean the crop rectangle and
   * the source pixels no longer share an axis, and every later pan would need
   * to be un-rotated to make sense of it.
   */
  const rotate = async () => {
    if (!source || busy) return
    setBusy(true)
    try {
      const context = ImageManipulator.manipulate(source.uri)
      context.rotate(-90)
      const rendered = await context.renderAsync()
      const saved = await rendered.saveAsync({ compress: 1, format: SaveFormat.JPEG })
      setSource({ uri: saved.uri, width: rendered.width, height: rendered.height })
      resetTransform()
    } catch {
      setError("That image couldn't be rotated.")
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    if (!source || busy) return
    setBusy(true)
    try {
      const s = scale.value
      const shownSize = frame / (base * s)

      /**
       * Frame position expressed in source pixels. The image is centred in the
       * frame and then moved by the gesture, so the frame's top-left sits this
       * far into it — divided back down by the on-screen scale to land in the
       * original's coordinate space.
       */
      const rawX = (fittedWidth * s) / 2 - tx.value - frame / 2
      const rawY = (fittedHeight * s) / 2 - ty.value - frame / 2
      const originX = Math.min(
        Math.max(0, rawX / (base * s)),
        Math.max(0, source.width - shownSize),
      )
      const originY = Math.min(
        Math.max(0, rawY / (base * s)),
        Math.max(0, source.height - shownSize),
      )
      // Never ask for pixels past the edge — the native cropper throws on it.
      const size = Math.min(shownSize, source.width - originX, source.height - originY)

      const context = ImageManipulator.manipulate(source.uri)
      context.crop({ originX, originY, width: size, height: size })
      context.resize({ width: OUTPUT_SIZE, height: OUTPUT_SIZE })
      const output = await (await context.renderAsync()).saveAsync({
        compress: 0.92,
        format: SaveFormat.JPEG,
      })

      /**
       * Hand the result back to the form rather than uploading here: the edit
       * screen owns the avatar mutation and the error surface, and merging into
       * its params keeps this screen a pure editor.
       */
      navigation.navigate({
        name: 'EditProfile',
        params: { croppedAvatarUri: output.uri },
        merge: true,
      })
    } catch {
      setError("That crop couldn't be saved. Try again.")
      setBusy(false)
    }
  }

  const styles = useMemo(() => createStyles(frame), [frame])

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="close" size={24} color="#ffffff" />
        </Pressable>
        <Text style={styles.headerTitle}>Adjust photo</Text>
        <Pressable
          onPress={rotate}
          disabled={!source || busy}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Rotate left"
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons
            name="refresh-outline"
            size={22}
            color={!source || busy ? 'rgba(255,255,255,0.35)' : '#ffffff'}
            style={styles.rotateIcon}
          />
        </Pressable>
      </View>

      <View style={styles.stage}>
        {source ? (
          <GestureDetector gesture={gesture}>
            <View style={styles.frame} collapsable={false}>
              <Animated.Image
                source={{ uri: source.uri }}
                style={[
                  { width: fittedWidth, height: fittedHeight },
                  imageStyle,
                ]}
                resizeMode="cover"
              />
              {/* Mask: dark surround plus the circle the avatar is shown in. */}
              <View style={styles.maskRow} pointerEvents="none">
                <View style={styles.circle} />
              </View>
            </View>
          </GestureDetector>
        ) : (
          <View style={styles.frame}>
            {error ? null : <ActivityIndicator color="#ffffff" />}
          </View>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <Text style={styles.hint}>Drag to reposition · Pinch to zoom</Text>
        )}
        <Button
          title="Use photo"
          onPress={confirm}
          loading={busy}
          disabled={!source}
          fullWidth
        />
        <Pressable
          onPress={resetTransform}
          disabled={!source || busy}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Reset adjustments"
        >
          <Text style={styles.reset}>Reset</Text>
        </Pressable>
      </View>
    </View>
  )
}

function createStyles(frame: number) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: BACKDROP },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    headerBtn: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { ...typography.bodyStrong, color: '#ffffff' },
    /** Mirrored so the refresh glyph reads as "rotate left". */
    rotateIcon: { transform: [{ scaleX: -1 }] },
    stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    frame: {
      width: frame,
      height: frame,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#000000',
    },
    maskRow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    /**
     * Inverted circular mask, done with one view instead of four overlays.
     * RN borders grow inward, so the box is oversized by `frame` on every side
     * and given a border that thick: its content box then lands exactly on the
     * frame, and an outer radius of 1.5x leaves an inner edge of exactly
     * frame/2 — a clear circle with everything outside it dimmed. The frame's
     * `overflow: hidden` trims the overhang.
     */
    circle: {
      position: 'absolute',
      top: -frame,
      left: -frame,
      width: frame * 3,
      height: frame * 3,
      borderRadius: frame * 1.5,
      borderWidth: frame,
      borderColor: MASK,
    },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      gap: spacing.md,
      alignItems: 'center',
    },
    hint: { ...typography.caption, color: 'rgba(255,255,255,0.6)' },
    error: { ...typography.caption, color: '#fca5a5', textAlign: 'center' },
    reset: {
      ...typography.captionStrong,
      color: 'rgba(255,255,255,0.85)',
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
    },
  })
}
