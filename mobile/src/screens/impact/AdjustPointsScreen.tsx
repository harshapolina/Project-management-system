import { useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Avatar } from '../../components/Avatar'
import { SearchField } from '../../components/SearchField'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { impactApi } from '../../api/impact'
import { isApiError } from '../../api/client'
import { roleLabel, signedPoints } from './impactMeta'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'ImpactAdjust'>

/** Quick amounts, so the common case is one tap rather than typing. */
const PRESETS = [10, 25, 50, -10, -25]

export function AdjustPointsScreen({ route, navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const queryClient = useQueryClient()

  const [userId, setUserId] = useState(route.params?.userId || '')
  const [search, setSearch] = useState('')
  const [ruleKey, setRuleKey] = useState('')
  const [points, setPoints] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const overview = useQuery({ queryKey: ['impact-overview'], queryFn: impactApi.overview })

  const people = useMemo(() => {
    const list = overview.data?.people || []
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((p) =>
      [p.name, p.role, p.title].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [overview.data?.people, search])

  const rules = useMemo(
    () => (overview.data?.rules || []).filter((r) => r.enabled),
    [overview.data?.rules],
  )

  const selected = overview.data?.people.find((p) => p._id === userId)

  const mutation = useMutation({
    mutationFn: () =>
      impactApi.adjust({
        userId,
        ...(ruleKey ? { ruleKey } : { points: Number(points) }),
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impact-overview'] })
      queryClient.invalidateQueries({ queryKey: ['impact-leaderboard'] })
      queryClient.invalidateQueries({ queryKey: ['impact-me'] })
      navigation.goBack()
    },
    onError: (err) => {
      Alert.alert('Could not adjust', isApiError(err) ? err.message : 'Try again.')
    },
  })

  const submit = () => {
    if (!userId) {
      setError('Pick who this is for.')
      return
    }
    if (!ruleKey) {
      const n = Number(points)
      if (!Number.isFinite(n) || n === 0) {
        setError('Enter a non-zero amount, or pick a rule.')
        return
      }
    }
    setError('')
    mutation.mutate()
  }

  return (
    <FormLayout
      title="Adjust points"
      subtitle="Add or deduct for any teammate"
      subtitleIcon="trophy-outline"
      card={false}
      loading={overview.isPending && !overview.data}
      footer={
        <Button
          title="Save adjustment"
          onPress={submit}
          loading={mutation.isPending}
          disabled={!userId}
        />
      }
    >
      <View style={styles.block}>
        <Text style={styles.label}>Employee</Text>
        {selected ? (
          <View style={styles.selectedRow}>
            <Avatar name={selected.name} uri={selected.avatar} size={34} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>
                {selected.name}
              </Text>
              <Text style={styles.meta}>{roleLabel(selected.role)}</Text>
            </View>
            <Pressable onPress={() => setUserId('')} hitSlop={8} accessibilityRole="button">
              <Text style={styles.change}>Change</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder="Search teammates"
              inset={false}
            />
            <View style={styles.peopleList}>
              {people.map((p) => (
                <Pressable
                  key={p._id}
                  style={styles.personRow}
                  onPress={() => setUserId(p._id)}
                  accessibilityRole="button"
                >
                  <Avatar name={p.name} uri={p.avatar} size={30} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.meta}>{roleLabel(p.role)}</Text>
                  </View>
                </Pressable>
              ))}
              {!people.length ? <Text style={styles.meta}>No teammates match that search.</Text> : null}
            </View>
          </>
        )}
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>Reason</Text>
        <Text style={styles.hint}>Award through a rule, or enter a custom amount below.</Text>
        <View style={styles.chipWrap}>
          <Pressable
            onPress={() => setRuleKey('')}
            style={[styles.chip, !ruleKey && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: !ruleKey }}
          >
            <Text style={[styles.chipText, !ruleKey && styles.chipTextActive]}>Custom points</Text>
          </Pressable>
          {rules.map((r) => (
            <Pressable
              key={r._id}
              onPress={() => {
                setRuleKey(r.key)
                setPoints('')
              }}
              style={[styles.chip, ruleKey === r.key && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: ruleKey === r.key }}
            >
              <Text
                style={[styles.chipText, ruleKey === r.key && styles.chipTextActive]}
                numberOfLines={1}
              >
                {`${r.label} ${signedPoints(r.points)}`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {!ruleKey ? (
        <View style={styles.block}>
          <Input
            label="Points"
            value={points}
            onChangeText={(t) => setPoints(t.replace(/[^\d-]/g, ''))}
            keyboardType="numbers-and-punctuation"
            placeholder="e.g. 25, or -10 to deduct"
          />
          <View style={styles.chipWrap}>
            {PRESETS.map((n) => (
              <Pressable
                key={n}
                onPress={() => setPoints(String(n))}
                style={[styles.chip, points === String(n) && styles.chipActive]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.chipText,
                    points === String(n) && styles.chipTextActive,
                    n < 0 && points !== String(n) && { color: colors.danger },
                  ]}
                >
                  {signedPoints(n)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Input
        label="Note"
        value={note}
        onChangeText={setNote}
        placeholder="What is this for? The teammate sees this."
        multiline
        numberOfLines={3}
        error={error || undefined}
      />
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    block: { gap: spacing.sm },
    label: { ...typography.captionStrong, color: c.textSecondary },
    hint: { ...typography.caption, color: c.textMuted },
    meta: { ...typography.caption, color: c.textSecondary },
    name: { ...typography.bodyStrong, color: c.textPrimary },
    change: { ...typography.captionStrong, color: c.accentHover },
    selectedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    peopleList: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
    },
    personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      maxWidth: '100%',
    },
    chipActive: { backgroundColor: c.textPrimary, borderColor: c.textPrimary },
    chipText: { ...typography.caption, color: c.textSecondary },
    chipTextActive: { color: c.canvas },
  })
}
