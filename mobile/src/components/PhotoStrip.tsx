import { useMemo, useRef, useState } from 'react'
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { assetUrl } from '../constants/env'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'

export type Photo = { url: string } | string

function urlOf(photo: Photo): string {
  return assetUrl(typeof photo === 'string' ? photo : photo?.url)
}

/**
 * Horizontal thumbnails that open a full-screen, swipeable viewer.
 *
 * Site updates and snags carry photos taken on site; showing only a count
 * (what the feed used to do) hides the whole point of the post.
 */
export function PhotoStrip({
  photos,
  size = 84,
  style,
}: {
  photos?: Photo[]
  size?: number
  style?: StyleProp<ViewStyle>
}) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [viewerAt, setViewerAt] = useState<number | null>(null)

  const urls = useMemo(
    () => (photos || []).map(urlOf).filter(Boolean),
    [photos],
  )
  if (!urls.length) return null

  return (
    <View style={style}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {urls.map((uri, i) => (
          <Pressable
            key={`${uri}-${i}`}
            onPress={() => setViewerAt(i)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Photo ${i + 1} of ${urls.length}`}
            style={({ pressed }) => [pressed && { opacity: 0.85 }]}
          >
            <Image
              source={{ uri }}
              style={[styles.thumb, { width: size, height: size }]}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </ScrollView>

      <PhotoViewer
        photos={urls}
        index={viewerAt}
        onClose={() => setViewerAt(null)}
      />
    </View>
  )
}

/** Full-screen pager. `index === null` keeps it closed. */
export function PhotoViewer({
  photos,
  index,
  onClose,
}: {
  photos: string[]
  index: number | null
  onClose: () => void
}) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { width, height } = Dimensions.get('window')
  const [page, setPage] = useState(index ?? 0)
  const scrollRef = useRef<ScrollView>(null)

  const open = index != null
  const start = index ?? 0

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={() => {
        setPage(start)
        // `contentOffset` only lands the initial page on iOS; scroll explicitly
        // so Android opens on the thumbnail that was tapped too.
        requestAnimationFrame(() =>
          scrollRef.current?.scrollTo({ x: start * width, animated: false }),
        )
      }}
      statusBarTranslucent
    >
      <View style={styles.viewerRoot}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: start * width, y: 0 }}
          onMomentumScrollEnd={(e) =>
            setPage(Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1)))
          }
        >
          {photos.map((uri, i) => (
            <View key={`${uri}-${i}`} style={{ width, height }}>
              <Image
                source={{ uri }}
                style={{ width, height }}
                resizeMode="contain"
                accessibilityLabel={`Photo ${i + 1}`}
              />
            </View>
          ))}
        </ScrollView>

        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close photo"
          style={styles.viewerClose}
        >
          <Ionicons name="close" size={22} color="#ffffff" />
        </Pressable>

        {photos.length > 1 ? (
          <View style={styles.viewerCount}>
            <Text style={styles.viewerCountText}>
              {page + 1} / {photos.length}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    strip: { gap: spacing.sm, paddingVertical: 2 },
    thumb: {
      borderRadius: radius.md,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
    },
    viewerRoot: { flex: 1, backgroundColor: '#000000' },
    viewerClose: {
      position: 'absolute',
      top: 52,
      right: 18,
      width: 38,
      height: 38,
      borderRadius: radius.full,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewerCount: {
      position: 'absolute',
      bottom: 46,
      alignSelf: 'center',
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: radius.full,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    viewerCountText: { ...typography.caption, color: '#ffffff' },
  })
}
