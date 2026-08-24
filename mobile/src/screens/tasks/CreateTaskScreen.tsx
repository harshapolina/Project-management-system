import { useMemo, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { tasksApi } from '../../api/tasks'
import { isApiError } from '../../api/client'
import type { RouteProp, NavigationProp } from '@react-navigation/native'
import type { HomeStackParamList } from '../../navigation/types'

type Props = {
  route: RouteProp<HomeStackParamList, 'CreateTask'>
  navigation: NavigationProp<HomeStackParamList>
}

export function CreateTaskScreen({ route, navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
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
    <FormLayout
      title={isPersonal ? 'Personal task' : 'New task'}
      subtitle="Capture what needs to happen next"
      subtitleIcon="checkbox-outline"
      onBack={() => navigation.goBack()}
      footer={
        <Button title="Create task" onPress={onSubmit} loading={mutation.isPending} fullWidth />
      }
    >
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
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    error: { ...typography.caption, color: c.danger },
  })
}
