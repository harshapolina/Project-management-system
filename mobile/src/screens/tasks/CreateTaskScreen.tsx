import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { colors, spacing, typography } from '../../constants/theme'
import { tasksApi } from '../../api/tasks'
import { isApiError } from '../../api/client'
import type { RouteProp, NavigationProp } from '@react-navigation/native'
import type { HomeStackParamList } from '../../navigation/types'

// Mounted identically in HomeStackParamList and ProjectStackParamList (both
// declare the same `CreateTask` param shape) — see TaskDetailScreen for why
// one stack's type safely describes both.
type Props = {
  route: RouteProp<HomeStackParamList, 'CreateTask'>
  navigation: NavigationProp<HomeStackParamList>
}

export function CreateTaskScreen({ route, navigation }: Props) {
  const { projectId, isPersonal } = route.params || {}
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      tasksApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        projectId,
        isPersonal: !!isPersonal,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      navigation.goBack()
    },
    onError: (err: unknown) => setError(isApiError(err) ? err.message : 'Could not create task'),
  })

  const onSubmit = () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setError('')
    mutation.mutate()
  }

  return (
    <Screen keyboardAvoiding>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>{isPersonal ? 'New personal task' : 'New task'}</Text>
        <View style={styles.form}>
          <Input label="Title" placeholder="What needs to happen?" value={title} onChangeText={setTitle} autoFocus />
          <Input
            label="Description (optional)"
            placeholder="Add more detail…"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Create task" onPress={onSubmit} loading={mutation.isPending} fullWidth />
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl, gap: spacing.lg },
  heading: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.md },
  form: { gap: spacing.md },
  error: { ...typography.caption, color: colors.danger },
})
