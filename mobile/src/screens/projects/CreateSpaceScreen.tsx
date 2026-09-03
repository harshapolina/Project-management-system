import { useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { spacesApi } from '../../api/spaces'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProjectStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProjectStackParamList, 'CreateSpace'>

/** Matches the swatches the web create-space modal offers. */
const COLORS = ['#7B68EE', '#3ecf8e', '#eab308', '#ef4444', '#0ea5e9', '#f97316']

export function CreateSpaceScreen({ navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      spacesApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spaces'] })
      navigation.goBack()
    },
    onError: (err) => {
      Alert.alert('Could not create space', isApiError(err) ? err.message : 'Try again.')
    },
  })

  const submit = () => {
    if (!name.trim()) {
      setError('Space name is required.')
      return
    }
    setError('')
    mutation.mutate()
  }

  return (
    <FormLayout
      title="New space"
      subtitle="Group related projects together"
      subtitleIcon="albums-outline"
      footer={
        <Button title="Create space" onPress={submit} loading={mutation.isPending} disabled={!name.trim()} fullWidth />
      }
    >
      <Input
        label="Space name"
        placeholder="e.g. Hyderabad residential"
        value={name}
        onChangeText={setName}
        error={error || undefined}
      />
      <Input
        label="Description (optional)"
        placeholder="What belongs in here?"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <View>
        <Text style={styles.label}>Colour</Text>
        <View style={styles.swatchRow}>
          {COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              accessibilityRole="button"
              accessibilityLabel={`Colour ${c}`}
              accessibilityState={{ selected: color === c }}
              style={[
                styles.swatch,
                { backgroundColor: c },
                color === c && { borderColor: colors.textPrimary, borderWidth: 3 },
              ]}
            />
          ))}
        </View>
      </View>
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    label: { ...typography.captionStrong, color: c.textSecondary, marginBottom: spacing.sm },
    swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    swatch: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.border,
    },
  })
}
