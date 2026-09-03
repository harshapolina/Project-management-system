import { useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Input } from './Input'
import { formatInr, radius, spacing, typography } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { boqApi } from '../api/boq'
import type { MaterialCatalogItem } from '../types/ops'

export function MaterialCatalogPicker({
  visible,
  onClose,
  onPick,
  boqType,
}: {
  visible: boolean
  onClose: () => void
  onPick: (item: MaterialCatalogItem) => void
  boqType?: string
}) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [query, setQuery] = useState('')

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['material-catalog', query, boqType],
    queryFn: () => boqApi.materialCatalog({ q: query.trim() || undefined, boqType }),
    enabled: visible,
  })

  const close = () => {
    setQuery('')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Material catalog</Text>
            <Pressable onPress={close} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <Input
            placeholder="Search materials…"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isLoading || isFetching ? (
            <ActivityIndicator color={colors.accent} style={styles.loader} />
          ) : (
            <FlatList
              data={data ?? []}
              keyExtractor={(item, i) => item._id || `${item.description}-${i}`}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              ListEmptyComponent={<Text style={styles.empty}>No materials found</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.row}
                  onPress={() => {
                    onPick(item)
                    close()
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {[item.category, item.unit].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {item.rate != null ? <Text style={styles.rate}>{formatInr(item.rate)}</Text> : null}
                </Pressable>
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function createStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.md,
      maxHeight: '80%',
      gap: spacing.sm,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { ...typography.bodyStrong, color: c.textPrimary },
    loader: { marginVertical: spacing.lg },
    list: { maxHeight: 360 },
    empty: { ...typography.caption, color: c.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowTitle: { ...typography.body, color: c.textPrimary },
    rowMeta: { ...typography.caption, color: c.textSecondary },
    rate: { ...typography.captionStrong, color: c.accent },
  })
}
