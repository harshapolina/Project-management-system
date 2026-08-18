import { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { colors, spacing, typography } from '../../constants/theme'
import { vendorsApi } from '../../api/procurement'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'CreateVendor'>

export function CreateVendorScreen({ navigation }: Props) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [gst, setGst] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      vendorsApi.create({
        name: name.trim(),
        contact: contact.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        gst: gst.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      navigation.goBack()
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not add vendor'),
  })

  return (
    <Screen keyboardAvoiding>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Input label="Vendor name" value={name} onChangeText={setName} />
        <Input label="Contact person (optional)" value={contact} onChangeText={setContact} />
        <Input label="Phone (optional)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <Input label="Email (optional)" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <Input label="GSTIN (optional)" autoCapitalize="characters" value={gst} onChangeText={setGst} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Add vendor"
          onPress={() => {
            if (!name.trim()) {
              setError('Vendor name is required')
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
