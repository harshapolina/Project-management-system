import { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { colors, spacing, typography } from '../../constants/theme'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProfileStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditProfile'>

export function EditProfileScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [title, setTitle] = useState(user?.title || '')
  const [company, setCompany] = useState(user?.company || '')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => authApi.updateMe({ name: name.trim(), phone: phone.trim(), title: title.trim(), company: company.trim() }),
    onSuccess: (data) => {
      setUser(data.user)
      navigation.goBack()
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not update profile'),
  })

  return (
    <Screen keyboardAvoiding>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Input label="Name" value={name} onChangeText={setName} />
        <Input label="Title" placeholder="e.g. Senior Project Manager" value={title} onChangeText={setTitle} />
        <Input label="Company" value={company} onChangeText={setCompany} />
        <Input label="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Save changes"
          onPress={() => {
            if (!name.trim()) {
              setError('Name is required')
              return
            }
            setError('')
            mutation.mutate()
          }}
          loading={mutation.isPending}
          fullWidth
        />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.md, paddingBottom: spacing.xxl },
  error: { ...typography.caption, color: colors.danger },
})
