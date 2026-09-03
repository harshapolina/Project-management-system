import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { CollapsibleSection } from '../../components/CollapsibleSection'
import { FieldRow } from '../../components/FieldRow'
import { Button } from '../../components/Button'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { projectsApi } from '../../api/projects'
import { spacesApi } from '../../api/spaces'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProjectStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProjectStackParamList, 'CreateProject'>

const TYPES: {
  value: 'residential' | 'commercial' | 'renovation' | 'custom'
  label: string
}[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'custom', label: 'Custom' },
]

export function CreateProjectScreen({ navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [location, setLocation] = useState('')
  const [budget, setBudget] = useState('')
  const [type, setType] = useState<'residential' | 'commercial' | 'renovation' | 'custom'>(
    'residential',
  )
  const [spaceId, setSpaceId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const spaces = useQuery({ queryKey: ['spaces'], queryFn: spacesApi.list })

  const mutation = useMutation({
    mutationFn: () =>
      projectsApi.create({
        name: name.trim(),
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || undefined,
        location: location.trim() || undefined,
        budget: budget ? Number(budget) : undefined,
        type,
        spaceId: spaceId || undefined,
      }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      navigation.replace('ProjectOverview', { projectId: project._id, projectName: project.name })
    },
    onError: (err) => setErrors({ form: isApiError(err) ? err.message : 'Could not create project' }),
  })

  const onSubmit = () => {
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Project name is required'
    if (!clientName.trim()) next.clientName = 'Client name is required'
    setErrors(next)
    if (Object.keys(next).length === 0) mutation.mutate()
  }

  return (
    <FormLayout
      title="New project"
      subtitle="Set up a workspace for the client"
      subtitleIcon="folder-outline"

      footer={<Button title="Create project" onPress={onSubmit} loading={mutation.isPending} fullWidth />}
    >
      <View>
        <Text style={styles.label}>Property type</Text>
        <View style={styles.typeRow}>
          {TYPES.map((t) => (
            <Pressable
              key={t.value}
              onPress={() => setType(t.value)}
              style={[styles.typeChip, type === t.value && styles.typeChipActive]}
            >
              <Text style={[styles.typeChipText, type === t.value && styles.typeChipTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Input label="Project name" placeholder="e.g. Sharma Penthouse" value={name} onChangeText={setName} error={errors.name} />
      <Input
        label="Client name"
        placeholder="e.g. Priya Sharma"
        value={clientName}
        onChangeText={setClientName}
        error={errors.clientName}
      />
      {/*
        * Everything below is optional, so it starts collapsed: a project can be
        * created from the three fields above, and hiding the rest is what keeps
        * this sheet from scrolling on a small phone.
        */}
      <CollapsibleSection>
        <FieldRow>
          <Input
            label="Client phone"
            placeholder="+91…"
            keyboardType="phone-pad"
            value={clientPhone}
            onChangeText={setClientPhone}
          />
          <Input label="Location" placeholder="City, area" value={location} onChangeText={setLocation} />
        </FieldRow>
        <Input label="Budget" placeholder="0" keyboardType="numeric" value={budget} onChangeText={setBudget} />

        <View>
        <View style={styles.spaceHead}>
          <Text style={styles.label}>Space</Text>
          <Pressable
            onPress={() => navigation.navigate('CreateSpace')}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.spaceAction}>New space</Text>
          </Pressable>
        </View>
        <View style={styles.typeRow}>
          <Pressable
            onPress={() => setSpaceId('')}
            style={[styles.typeChip, !spaceId && styles.typeChipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: !spaceId }}
          >
            <Text style={[styles.typeChipText, !spaceId && styles.typeChipTextActive]}>No space</Text>
          </Pressable>
          {(spaces.data || []).map((sp) => (
            <Pressable
              key={sp._id}
              onPress={() => setSpaceId(sp._id)}
              style={[styles.typeChip, spaceId === sp._id && styles.typeChipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: spaceId === sp._id }}
            >
              <View style={[styles.spaceDot, { backgroundColor: sp.color }]} />
              <Text
                style={[styles.typeChipText, spaceId === sp._id && styles.typeChipTextActive]}
                numberOfLines={1}
              >
                {sp.name}
              </Text>
            </Pressable>
          ))}
        </View>
        </View>
      </CollapsibleSection>

      {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    label: { ...typography.captionStrong, color: c.textSecondary, marginBottom: spacing.sm },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    typeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
      maxWidth: '100%',
    },
    typeChipActive: { backgroundColor: c.textPrimary },
    typeChipText: { ...typography.caption, color: c.textSecondary },
    typeChipTextActive: { color: c.canvas, fontWeight: '700' },
    error: { ...typography.caption, color: c.danger },
    spaceHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    spaceAction: { ...typography.captionStrong, color: c.accentHover, marginBottom: spacing.sm },
    spaceDot: { width: 8, height: 8, borderRadius: 4 },
  })
}
