import { useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { LoadingState } from '../../components/States'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { impactApi } from '../../api/impact'
import { isApiError } from '../../api/client'
import { CATEGORY_LABELS, signedPoints } from './impactMeta'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'ImpactRule'>

/** Weight multiplies a rule's award; 0 mutes it without disabling the rule. */
const WEIGHTS = [0, 0.5, 1, 1.5, 2]

export function ImpactRuleScreen({ route, navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const queryClient = useQueryClient()
  const { ruleId } = route.params

  const { data, isLoading } = useQuery({ queryKey: ['impact-rules'], queryFn: impactApi.rules })
  const rule = data?.rules.find((r) => r._id === ruleId)

  // Each field stays null until it is first edited and falls back to the
  // fetched rule, so the form never blanks out while the query is in flight.
  const [pointsDraft, setPoints] = useState<string | null>(null)
  const [weightDraft, setWeight] = useState<number | null>(null)
  const [enabledDraft, setEnabled] = useState<boolean | null>(null)
  const [autoDraft, setAuto] = useState<boolean | null>(null)

  const points = pointsDraft ?? String(rule?.points ?? 0)
  const weight = weightDraft ?? rule?.weight ?? 1
  const enabled = enabledDraft ?? rule?.enabled ?? true
  const auto = autoDraft ?? rule?.auto ?? true

  const mutation = useMutation({
    mutationFn: () =>
      impactApi.updateRule(ruleId, {
        points: Number(points) || 0,
        weight,
        enabled,
        auto,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impact-rules'] })
      queryClient.invalidateQueries({ queryKey: ['impact-overview'] })
      navigation.goBack()
    },
    onError: (err) => {
      Alert.alert('Could not save', isApiError(err) ? err.message : 'Try again.')
    },
  })

  if (isLoading || !rule) {
    return (
      <FormLayout title="Point rule" card={false}>
        <LoadingState label="Loading rule…" variant="detail" />
      </FormLayout>
    )
  }

  return (
    <FormLayout
      title={rule.label}
      subtitle={CATEGORY_LABELS[rule.category] || rule.category}
      subtitleIcon="options-outline"
      card={false}
      footer={<Button title="Save rule" onPress={() => mutation.mutate()} loading={mutation.isPending} />}
    >
      {rule.description ? <Text style={styles.hint}>{rule.description}</Text> : null}

      <Input
        label="Points awarded"
        value={points}
        onChangeText={(t) => setPoints(t.replace(/[^\d-]/g, ''))}
        keyboardType="numbers-and-punctuation"
        hint="Negative values deduct — use them for penalties."
      />

      <View style={styles.block}>
        <Text style={styles.label}>Weight</Text>
        <Text style={styles.hint}>Multiplies the award. Set 0 to mute this rule without turning it off.</Text>
        <View style={styles.chipWrap}>
          {WEIGHTS.map((w) => (
            <Pressable
              key={w}
              onPress={() => setWeight(w)}
              style={[styles.chip, weight === w && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: weight === w }}
            >
              <Text style={[styles.chipText, weight === w && styles.chipTextActive]}>{`×${w}`}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>
          {`Effective award: ${signedPoints(Math.round((Number(points) || 0) * weight))} points`}
        </Text>
      </View>

      <View style={styles.toggleRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.label}>Rule is on</Text>
          <Text style={styles.hint}>Off means no points are awarded from this rule.</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{ true: colors.accent, false: colors.border }}
        />
      </View>

      <View style={styles.toggleRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.label}>Award automatically</Text>
          <Text style={styles.hint}>Off means an admin has to award it by hand.</Text>
        </View>
        <Switch
          value={auto}
          onValueChange={setAuto}
          trackColor={{ true: colors.accent, false: colors.border }}
        />
      </View>
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    block: { gap: spacing.sm },
    label: { ...typography.captionStrong, color: c.textSecondary },
    hint: { ...typography.caption, color: c.textMuted },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.textPrimary, borderColor: c.textPrimary },
    chipText: { ...typography.caption, color: c.textSecondary },
    chipTextActive: { color: c.canvas },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
  })
}
