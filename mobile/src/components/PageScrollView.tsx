import { Platform, ScrollView, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native'

const webOverflow = Platform.OS === 'web' ? ({ overflow: 'auto' } as object) : null

const pageStyle = [{ flex: 1, minHeight: 0 }, webOverflow]

/**
 * Props for a page-level vertical scroller: one region under the frozen
 * header, no nested card scrollbar, no gutter unless content actually overflows.
 */
export function pageScrollViewProps(style?: StyleProp<ViewStyle>): Partial<ScrollViewProps> {
  return {
    style: [pageStyle, style],
    showsVerticalScrollIndicator: false,
    nestedScrollEnabled: false,
    keyboardShouldPersistTaps: 'handled',
  }
}

export function mergePageContentStyle(existing?: StyleProp<ViewStyle>): StyleProp<ViewStyle> {
  return [{ flexGrow: 1 }, existing]
}

/**
 * Merge onto an existing vertical ScrollView / FlatList so NestedChrome
 * children pick up the same page-scroll behaviour as FormLayout.
 * Horizontal lists are left alone.
 */
export function mergePageScrollProps<T extends Record<string, unknown>>(props: T): T {
  if (props.horizontal) return props
  return {
    ...props,
    showsVerticalScrollIndicator: props.showsVerticalScrollIndicator ?? false,
    nestedScrollEnabled: false,
    keyboardShouldPersistTaps: props.keyboardShouldPersistTaps ?? 'handled',
    style: [pageStyle, props.style],
    contentContainerStyle: mergePageContentStyle(props.contentContainerStyle as StyleProp<ViewStyle>),
  }
}

/** The page body scroller FormLayout / NestedChrome / Screen share. */
export function PageScrollView({
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  children,
  ...rest
}: ScrollViewProps) {
  return (
    <ScrollView
      {...rest}
      style={[pageStyle, style]}
      contentContainerStyle={mergePageContentStyle(contentContainerStyle)}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={false}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    >
      {children}
    </ScrollView>
  )
}
