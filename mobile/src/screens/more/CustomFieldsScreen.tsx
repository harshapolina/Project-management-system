import { useMemo, useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Screen } from '../../components/Screen'
import { AppNavBar } from '../../components/AppNavBar'
import { PageHeader } from '../../components/PageHeader'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { SegmentedControl } from '../../components/SegmentedControl'
import { SurfaceCard } from '../../components/SurfaceCard'
import { SectionLabel } from '../../components/SectionLabel'
import { Pill } from '../../components/Badge'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { customFieldsApi } from '../../api/customFields'
import { isApiError } from '../../api/client'
import { useToastStore } from '../../store/toastStore'
import type { CustomFieldDefinition, CustomFieldType } from '../../types/models'
import type { MoreStackParamList } from '../../navigation/types'
import { goBackOrHome } from '../../navigation/openProject'

type Props = NativeStackScreenProps<MoreStackParamList, 'CustomFields'>

const TYPES: { key: CustomFieldType; label: string }[] = [
  { key: 'text', label: 'Text' },
  { key: 'number', label: 'Number' },
  { key: 'select', label: 'Select' },
  { key: 'user', label: 'Person' },
]

const TYPE_LABEL: Record<CustomFieldType, string> = {
  text: 'Text',
  number: 'Number',
  select: 'Select',
  user: 'Person',
}

/** `select` is the only type whose options are meaningful to the server. */
function parseOptions(raw: string) {
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}

export function CustomFieldsScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const queryClient = useQueryClient()
  const pushToast = useToastStore((s) => s.push)

  const [name, setName] = useState('')
  const [type, setType] = useState<CustomFieldType>('text')
  const [options, setOptions] = useState('')

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['custom-fields', 'all'],
    queryFn: customFieldsApi.all,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['custom-fields'] })

  const notifyError = (err: unknown) =>
    pushToast({
      title: 'Something went wrong',
      body: isApiError(err) ? err.message : undefined,
      type: 'error',
    })

  const createField = useMutation({
    mutationFn: () =>
      customFieldsApi.create({
        name: name.trim(),
        type,
        ...(type === 'select' ? { options: parseOptions(options) } : null),
      }),
    onSuccess: () => {
      invalidate()
      setName('')
      setType('text')
      setOptions('')
      pushToast({ title: 'Field created' })
    },
    onError: notifyError,
  })

  const toggleActive = useMutation({
    mutationFn: ({ field }: { field: CustomFieldDefinition }) =>
      field.isActive === false
        ? customFieldsApi.update(field._id, { isActive: true })
        : customFieldsApi.deactivate(field._id),
    onSuccess: (field) => {
      invalidate()
      pushToast({ title: field.isActive ? 'Field restored' : 'Field deactivated' })
    },
    onError: notifyError,
  })

  const confirmToggle = (field: CustomFieldDefinition) => {
    if (field.isActive === false) {
      toggleActive.mutate({ field })
      return
    }
    Alert.alert(
      `Deactivate “${field.name}”?`,
      'It stops appearing on task forms. Existing values are kept and it can be restored later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => toggleActive.mutate({ field }),
        },
      ],
    )
  }

  const canSubmit = name.trim().length > 0 && !createField.isPending

  const header = (
    <>
      <AppNavBar />
      <PageHeader
        title="Custom fields"
        subtitle="Extra fields on tasks"
        subtitleIcon="options-outline"
        onBack={() => goBackOrHome(navigation, route)}
      />
    </>
  )

  const composer = (
    <View style={styles.composer}>
      <SectionLabel>Add a field</SectionLabel>
      <SurfaceCard>
        <Input
          label="Field name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Room, Floor, Budget code"
          returnKeyType="done"
        />
        <Text style={styles.typeLabel}>Type</Text>
        <SegmentedControl options={TYPES} value={type} onChange={setType} inset={false} />
        {type === 'select' ? (
          <Input
            label="Options"
            value={options}
            onChangeText={setOptions}
            placeholder="Comma separated — Ground, First, Second"
            containerStyle={styles.optionsInput}
          />
        ) : null}
        <View style={styles.submit}>
          <Button
            title="Add field"
            onPress={() => createField.mutate()}
            disabled={!canSubmit}
            loading={createField.isPending}
            fullWidth
          />
        </View>
      </SurfaceCard>
      <SectionLabel>Existing fields</SectionLabel>
    </View>
  )

  if (isLoading) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        {header}
        <LoadingState label="Loading fields…" variant="list" />
      </Screen>
    )
  }

  if (isError) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        {header}
        <ErrorState
          message={isApiError(error) ? error.message : undefined}
          onRetry={() => refetch()}
        />
      </Screen>
    )
  }

  return (
    <Screen padded={false} edges={['left', 'right']}>
      {header}
      <FlatList
        data={data}
        keyExtractor={(f) => f._id}
        contentContainerStyle={listContent}
        ListHeaderComponent={composer}
        refreshing={isFetching}
        onRefresh={() => refetch()}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const inactive = item.isActive === false
          return (
            <SurfaceCard>
              <View style={styles.cardTop}>
                <View style={styles.cardHeadText}>
                  <Text style={[styles.name, inactive && styles.nameMuted]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {TYPE_LABEL[item.type]}
                    {item.type === 'select' && item.options?.length
                      ? ` · ${item.options.length} options`
                      : ''}
                  </Text>
                </View>
                {inactive ? (
                  <Pill label="Inactive" color={colors.textMuted} bg={colors.surfaceRaised} />
                ) : null}
              </View>

              {item.type === 'select' && item.options?.length ? (
                <View style={styles.optionChips}>
                  {item.options.map((opt) => (
                    <View key={opt} style={styles.optionChip}>
                      <Text style={styles.optionChipText} numberOfLines={1}>
                        {opt}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <Pressable
                style={styles.actionBtn}
                onPress={() => confirmToggle(item)}
                disabled={toggleActive.isPending}
              >
                <Ionicons
                  name={inactive ? 'refresh-outline' : 'archive-outline'}
                  size={13}
                  color={inactive ? colors.accent : colors.textSecondary}
                />
                <Text style={[styles.actionText, inactive && styles.actionTextActive]}>
                  {inactive ? 'Restore' : 'Deactivate'}
                </Text>
              </Pressable>
            </SurfaceCard>
          )
        }}
        ListEmptyComponent={
          <EmptyState
            title="No custom fields yet"
            body="Add one above to capture extra detail on every task — a room, a floor, a budget code."
          />
        }
      />
    </Screen>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    composer: { gap: spacing.sm },
    typeLabel: {
      ...typography.captionStrong,
      color: c.textSecondary,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    optionsInput: { marginTop: spacing.sm },
    submit: { marginTop: spacing.md },

    cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    cardHeadText: { flex: 1, minWidth: 0 },
    name: { ...typography.bodyStrong, color: c.textPrimary },
    nameMuted: { color: c.textMuted },
    meta: { ...typography.micro, color: c.textMuted, marginTop: 1 },

    optionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
    optionChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
    },
    optionChipText: { ...typography.micro, color: c.textSecondary },

    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      backgroundColor: c.surfaceRaised,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.full,
      marginTop: spacing.sm,
    },
    actionText: { ...typography.micro, color: c.textSecondary },
    actionTextActive: { color: c.accent },
  })
}
