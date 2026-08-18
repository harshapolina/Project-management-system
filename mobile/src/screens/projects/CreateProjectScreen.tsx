import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { projectsApi } from '../../api/projects'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProjectStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProjectStackParamList, 'CreateProject'>

const TYPES: { value: 'residential' | 'commercial' | 'blank'; label: string }[] = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'blank', label: 'Blank' },
]

export function CreateProjectScreen({ navigation }: Props) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [location, setLocation] = useState('')
  const [budget, setBudget] = useState('')
  const [type, setType] = useState<'residential' | 'commercial' | 'blank'>('residential')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: () =>
      projectsApi.create({
        name: name.trim(),
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || undefined,
        location: location.trim() || undefined,
        budget: budget ? Number(budget) : undefined,
        type,
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
    <Screen keyboardAvoiding>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>New project</Text>

        <View>
          <Text style={styles.label}>Project type</Text>
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

        <View style={styles.form}>
          <Input label="Project name" placeholder="e.g. Sharma Penthouse" value={name} onChangeText={setName} error={errors.name} />
          <Input label="Client name" placeholder="e.g. Priya Sharma" value={clientName} onChangeText={setClientName} error={errors.clientName} />
          <Input
            label="Client phone (optional)"
            placeholder="+91…"
            keyboardType="phone-pad"
            value={clientPhone}
            onChangeText={setClientPhone}
          />
          <Input label="Location (optional)" placeholder="City, area" value={location} onChangeText={setLocation} />
          <Input
            label="Budget (optional)"
            placeholder="0"
            keyboardType="numeric"
            value={budget}
            onChangeText={setBudget}
          />

          {errors.form ? <Text style={styles.error}>{errors.form}</Text> : null}

          <Button title="Create project" onPress={onSubmit} loading={mutation.isPending} fullWidth />
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl, gap: spacing.lg },
  heading: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.md },
  label: { ...typography.captionStrong, color: colors.textSecondary, marginBottom: spacing.sm },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
  },
  typeChipActive: { backgroundColor: colors.rail },
  typeChipText: { ...typography.caption, color: colors.textSecondary },
  typeChipTextActive: { color: '#fff', fontWeight: '700' },
  form: { gap: spacing.md },
  error: { ...typography.caption, color: colors.danger },
})
