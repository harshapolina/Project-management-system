import { useMemo, useState } from 'react'
import { Alert, StyleSheet, Switch, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { SurfaceCard } from '../../components/SurfaceCard'
import { LoadingState } from '../../components/States'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { procurementFlowApi } from '../../api/procurementFlow'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'CreateQc'>

interface LineEdit {
  acceptedQty?: string
  damagedQty?: string
  shortageQty?: string
  brandOk?: boolean
  sizeOk?: boolean
  remarks?: string
}

/**
 * Quality check against a GRN. Damage or shortage here makes the server draft
 * a debit note automatically, so the numbers entered are the ones the vendor
 * gets billed back for.
 */
export function CreateQcScreen({ route, navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const qc = useQueryClient()
  const { grnId, grnNumber } = route.params

  const [edits, setEdits] = useState<Record<number, LineEdit>>({})
  const [siteRemarks, setSiteRemarks] = useState('')
  const [error, setError] = useState('')

  const grns = useQuery({ queryKey: ['grns', ''], queryFn: () => procurementFlowApi.grns() })
  const grn = (grns.data || []).find((g) => g._id === grnId)

  const setLine = (index: number, patch: LineEdit) => {
    setEdits((prev) => ({ ...prev, [index]: { ...prev[index], ...patch } }))
  }

  const mutation = useMutation({
    mutationFn: () =>
      procurementFlowApi.createInspection({
        grn: grnId,
        siteRemarks: siteRemarks.trim(),
        items: (grn?.items || []).map((line, i) => {
          const edit = edits[i] || {}
          const received = Number(line.receivedQty) || 0
          return {
            description: line.description,
            receivedQty: received,
            acceptedQty: edit.acceptedQty !== undefined ? Number(edit.acceptedQty) || 0 : received,
            damagedQty: Number(edit.damagedQty) || 0,
            shortageQty: Number(edit.shortageQty) || 0,
            brandOk: edit.brandOk !== false,
            sizeOk: edit.sizeOk !== false,
            remarks: edit.remarks || '',
          }
        }),
      }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['qc-inspections'] })
      qc.invalidateQueries({ queryKey: ['grns'] })
      qc.invalidateQueries({ queryKey: ['debit-notes'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['procurement-dashboard'] })
      if (result.debitNote) {
        Alert.alert(
          'Debit note drafted',
          `${result.debitNote.debitNumber} was drafted for the shortage or damage. Send it from the Debit notes tab.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        )
        return
      }
      navigation.goBack()
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not save the quality check'),
  })

  if (grns.isLoading) {
    return (
      <FormLayout title="Quality check" subtitle={grnNumber} subtitleIcon="checkmark-done-outline" card={false}>
        <LoadingState label="Loading GRN…" variant="form" />
      </FormLayout>
    )
  }

  if (!grn) {
    return (
      <FormLayout title="Quality check" subtitle={grnNumber} subtitleIcon="checkmark-done-outline">
        <Text style={styles.error}>That GRN is no longer available.</Text>
      </FormLayout>
    )
  }

  return (
    <FormLayout
      title="Quality check"
      subtitle={grn.grnNumber}
      subtitleIcon="checkmark-done-outline"
      card={false}
      footer={
        <Button
          title="Save quality check"
          onPress={() => {
            setError('')
            mutation.mutate()
          }}
          loading={mutation.isPending}
          fullWidth
        />
      }
    >
      <Text style={styles.intro}>
        Accepted quantities go into inventory. Damage or shortage drafts a debit note against the vendor.
      </Text>

      {grn.items.map((line, i) => {
        const edit = edits[i] || {}
        const received = Number(line.receivedQty) || 0
        const accepted = edit.acceptedQty !== undefined ? Number(edit.acceptedQty) || 0 : received
        const damaged = Number(edit.damagedQty) || 0
        const shortage = Number(edit.shortageQty) || 0
        return (
          <SurfaceCard key={line._id || i}>
            <Text style={styles.lineDesc}>{line.description || `Line ${i + 1}`}</Text>
            <Text style={styles.lineMeta}>
              Received {received} {line.unit}
            </Text>

            <View style={styles.row}>
              <Input
                label="Accepted"
                keyboardType="numeric"
                value={edit.acceptedQty !== undefined ? edit.acceptedQty : String(received)}
                onChangeText={(v) => setLine(i, { acceptedQty: v })}
                containerStyle={styles.flex}
              />
              <Input
                label="Damaged"
                keyboardType="numeric"
                value={edit.damagedQty ?? ''}
                placeholder="0"
                onChangeText={(v) => setLine(i, { damagedQty: v })}
                containerStyle={styles.flex}
              />
              <Input
                label="Short"
                keyboardType="numeric"
                value={edit.shortageQty ?? ''}
                placeholder="0"
                onChangeText={(v) => setLine(i, { shortageQty: v })}
                containerStyle={styles.flex}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Brand as specified</Text>
              <Switch
                value={edit.brandOk !== false}
                onValueChange={(v) => setLine(i, { brandOk: v })}
                trackColor={{ true: colors.accent }}
              />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Size / spec correct</Text>
              <Switch
                value={edit.sizeOk !== false}
                onValueChange={(v) => setLine(i, { sizeOk: v })}
                trackColor={{ true: colors.accent }}
              />
            </View>

            <Input
              label="Remarks"
              value={edit.remarks ?? ''}
              onChangeText={(v) => setLine(i, { remarks: v })}
            />

            {accepted + damaged + shortage > received ? (
              <Text style={styles.warn}>
                Accepted + damaged + short is more than what was received ({received}).
              </Text>
            ) : null}
            {damaged > 0 || shortage > 0 ? (
              <Text style={styles.debit}>
                Will be debited to the vendor at {line.rate ? `₹${line.rate}` : 'the GRN rate'} each.
              </Text>
            ) : null}
          </SurfaceCard>
        )
      })}

      <Input label="Site remarks" value={siteRemarks} onChangeText={setSiteRemarks} multiline />

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="warning-outline" size={14} color={colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    intro: { ...typography.caption, color: c.textSecondary },
    lineDesc: { ...typography.bodyStrong, color: c.textPrimary },
    lineMeta: { ...typography.micro, color: c.textMuted, marginTop: 2, marginBottom: spacing.sm },
    row: { flexDirection: 'row', gap: spacing.sm },
    flex: { flex: 1 },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    toggleLabel: { ...typography.caption, color: c.textSecondary },
    warn: { ...typography.micro, color: c.warning, marginTop: 6 },
    debit: { ...typography.micro, color: c.textMuted, marginTop: 4 },
    errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    error: { ...typography.caption, color: c.danger, flex: 1 },
  })
}
