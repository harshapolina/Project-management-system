import { NestedChrome } from '../../components/NestedChrome'
import { useEffect, useMemo, useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { LoadingState, ErrorState, EmptyState } from '../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { boqApi } from '../../api/boq'
import { isApiError } from '../../api/client'
import type { BoqItem, MeasurementQuotationItem, MeasurementRow } from '../../types/ops'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'BoqMeasurement'>

function rowQty(row: MeasurementRow): number {
  const nos = Number(row.nos) || 0
  const l = Number(row.length) || 0
  const w = Number(row.width) || 0
  if (nos && l && w) return nos * l * w
  if (nos && l) return nos * l
  return Number(row.qty) || nos || 0
}

function measureItemTotal(item: MeasurementQuotationItem): number {
  if (item.overrideTotal != null) {
    return Number(item.overrideTotal) || 0
  }
  return (item.rows || []).reduce((sum, row) => sum + rowQty(row), 0)
}

export function MeasurementSheetScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const queryClient = useQueryClient()
  const { quotationId } = route.params

  const [measurements, setMeasurements] = useState<MeasurementQuotationItem[]>([])
  const [selectedSpaces, setSelectedSpaces] = useState<string[]>([])
  const [seeded, setSeeded] = useState(false)

  const { data: quotation, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['quotation', quotationId],
    queryFn: () => boqApi.get(quotationId),
  })

  const boqType = quotation?.boqType === 'commercial' ? 'commercial' : null

  const catalog = useQuery({
    queryKey: ['measurement-catalog', boqType, selectedSpaces.join(',')],
    queryFn: () =>
      boqApi.measurementCatalog(
        boqType!,
        selectedSpaces.length ? selectedSpaces.join(',') : undefined,
      ),
    enabled: !!quotation && boqType === 'commercial',
    staleTime: 60 * 60 * 1000,
  })

  useEffect(() => {
    if (!quotation) return
    setMeasurements(quotation.measurements?.map((m) => ({ ...m, rows: m.rows?.map((r) => ({ ...r })) })) || [])
    setSelectedSpaces(quotation.spaces || [])
    setSeeded(!!quotation.measurements?.length)
  }, [quotation?._id])

  useEffect(() => {
    if (seeded || !catalog.data?.items?.length) return
    if (quotation?.measurements?.length) return
    setMeasurements(catalog.data.items.map((m) => ({ ...m, rows: m.rows?.map((r) => ({ ...r })) })))
    if (!selectedSpaces.length && catalog.data.spaces?.length) {
      setSelectedSpaces(catalog.data.spaces.map((s) => s.name))
    }
    setSeeded(true)
  }, [catalog.data, quotation?.measurements?.length, seeded, selectedSpaces.length])

  const saveMutation = useMutation({
    mutationFn: () =>
      boqApi.update(quotationId, {
        measurements: measurements.map((m) => ({
          ...m,
          rows: (m.rows || []).map((r) => ({ ...r, qty: rowQty(r) })),
        })),
        spaces: selectedSpaces,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', quotationId] })
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      Alert.alert('Saved', 'Measurement sheet updated.')
    },
    onError: (err) => Alert.alert('Could not save', isApiError(err) ? err.message : 'Try again'),
  })

  const pushMutation = useMutation({
    mutationFn: async () => {
      if (!quotation) throw new Error('Quotation not loaded')
      const bySortIndex = new Map<number, number>()
      const sectionSums = new Map<string, number>()

      for (const m of measurements) {
        const total = measureItemTotal(m)
        const key = `${m.group}|${m.sectionName}`
        sectionSums.set(key, (sectionSums.get(key) || 0) + total)
        if (m.boqRef && m.boqRef.index >= 0) bySortIndex.set(m.boqRef.index, total)
      }
      for (const m of measurements) {
        if (!m.boqTotalLabel || !(m.boqRef?.index != null && m.boqRef.index >= 0)) continue
        const key = `${m.group}|${m.sectionName}`
        bySortIndex.set(
          m.boqRef.index,
          m.boqTotal == null
            ? sectionSums.get(key) || 0
            : Number(m.boqTotal) || 0,
        )
      }

      const nextItems: BoqItem[] = quotation.items.map((it) => {
        const total = bySortIndex.get(it.sortIndex ?? -1)
        if (total == null || it.unit === 'ls') return it
        const qty = total
        return { ...it, qty, amount: qty * (it.rate || 0), measureNo: 0, width: 0, height: 0 }
      })

      return boqApi.update(quotationId, {
        measurements: measurements.map((m) => ({
          ...m,
          rows: (m.rows || []).map((r) => ({ ...r, qty: rowQty(r) })),
        })),
        spaces: selectedSpaces,
        items: nextItems,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', quotationId] })
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      Alert.alert('Applied', 'BOQ quantities were updated from the take-off.', [
        { text: 'View BOQ', onPress: () => navigation.navigate('BoqDetail', { quotationId }) },
        { text: 'OK' },
      ])
    },
    onError: (err) => Alert.alert('Could not apply', isApiError(err) ? err.message : 'Try again'),
  })

  const updateRow = (itemIndex: number, rowIndex: number, patch: Partial<MeasurementRow>) => {
    setMeasurements((prev) =>
      prev.map((item, i) => {
        if (i !== itemIndex) return item
        const rows = (item.rows || []).map((row, ri) => (ri === rowIndex ? { ...row, ...patch } : row))
        return { ...item, rows }
      }),
    )
  }

  const toggleSpace = (space: string) => {
    setSelectedSpaces((prev) => {
      const next = prev.includes(space) ? prev.filter((s) => s !== space) : [...prev, space]
      return next
    })
    setSeeded(false)
  }

  const chromeProps = {
    title: 'Measurement sheet',
    subtitle: quotation?.title || 'Take-off',
    subtitleIcon: 'resize-outline' as const,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading sheet…" variant="detail" />
      </NestedChrome>
    )
  }
  if (isError || !quotation) {
    return (
      <NestedChrome {...chromeProps}>
      <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  if (boqType !== 'commercial') {
    return (
      <NestedChrome {...chromeProps}>
      <EmptyState
          icon="resize-outline"
          title="No measurement sheet"
          body="Measurement take-off is available for commercial quotations only."
        />
      </NestedChrome>
    )
  }

  const spaceOptions = catalog.data?.spaces || []

  return (
    <NestedChrome {...chromeProps}>
      <FlatList
        data={measurements}
        keyExtractor={(item, index) => `${item.group}|${item.name}|${index}`}
        contentContainerStyle={listContent}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {spaceOptions.length ? (
              <>
                <SectionLabel>Spaces</SectionLabel>
                <View style={styles.chips}>
                  {spaceOptions.map((space) => {
                    const active = selectedSpaces.includes(space.name)
                    return (
                      <Pressable
                        key={space.name}
                        onPress={() => toggleSpace(space.name)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                          {space.name}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
              </>
            ) : null}
            <View style={styles.actionRow}>
              <Button title="Save sheet" size="sm" onPress={() => saveMutation.mutate()} loading={saveMutation.isPending} />
              <Button
                title="Push to BOQ"
                size="sm"
                variant="secondary"
                onPress={() => pushMutation.mutate()}
                loading={pushMutation.isPending}
              />
            </View>
            <SectionLabel count={measurements.length}>Work items</SectionLabel>
          </View>
        }
        renderItem={({ item, index: itemIndex }) => (
          <SurfaceCard style={styles.itemCard}>
            <Text style={styles.group}>{item.group}</Text>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemTotal}>Total: {formatInr(measureItemTotal(item))}</Text>
            {(item.rows || []).map((row, rowIndex) => (
              <View key={`${row.space}-${rowIndex}`} style={styles.rowBlock}>
                <Text style={styles.space}>{row.space || 'Space'}</Text>
                <View style={styles.dimRow}>
                  <Input
                    placeholder="No's"
                    keyboardType="numeric"
                    value={row.nos != null ? String(row.nos) : ''}
                    onChangeText={(v) => updateRow(itemIndex, rowIndex, { nos: Number(v) || 0 })}
                    containerStyle={styles.dimInput}
                  />
                  <Input
                    placeholder="L"
                    keyboardType="numeric"
                    value={row.length != null ? String(row.length) : ''}
                    onChangeText={(v) => updateRow(itemIndex, rowIndex, { length: Number(v) || 0 })}
                    containerStyle={styles.dimInput}
                  />
                  <Input
                    placeholder="W"
                    keyboardType="numeric"
                    value={row.width != null ? String(row.width) : ''}
                    onChangeText={(v) => updateRow(itemIndex, rowIndex, { width: Number(v) || 0 })}
                    containerStyle={styles.dimInput}
                  />
                  <Text style={styles.qty}>{rowQty(row).toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </SurfaceCard>
        )}
        ListEmptyComponent={
          catalog.isLoading ? (
            <LoadingState label="Loading catalog…" variant="list" />
          ) : (
            <EmptyState title="No measurements" body="Pick spaces to seed the take-off sheet." />
          )
        }
      />
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    headerBlock: { gap: spacing.md, marginBottom: spacing.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
      maxWidth: '100%',
    },
    chipActive: { backgroundColor: c.accent },
    chipText: { ...typography.caption, color: c.textSecondary },
    chipTextActive: { color: c.textOnAccent, fontWeight: '700' },
    actionRow: { flexDirection: 'row', gap: spacing.sm },
    itemCard: { gap: spacing.xs },
    group: { ...typography.micro, color: c.textMuted, textTransform: 'uppercase' },
    itemName: { ...typography.bodyStrong, color: c.textPrimary },
    itemTotal: { ...typography.captionStrong, color: c.accent, marginBottom: spacing.xs },
    rowBlock: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: spacing.sm,
      marginTop: spacing.sm,
      gap: spacing.xs,
    },
    space: { ...typography.caption, color: c.textSecondary },
    dimRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    dimInput: { flex: 1, minWidth: 0 },
    qty: { ...typography.captionStrong, color: c.textPrimary, minWidth: 48, textAlign: 'right' },
  })
}
