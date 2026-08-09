import { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { colors, spacing, typography } from '../../constants/theme'
import { leadsApi } from '../../api/leads'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'CreateLead'>

export function CreateLeadScreen({ navigation }: Props) {
  const queryClient = useQueryClient()
  const [clientName, setClientName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [estimatedValue, setEstimatedValue] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      leadsApi.create({
        clientName: clientName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      navigation.goBack()
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not create lead'),
  })

  return (
    <Screen keyboardAvoiding>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <Input label="Client name" placeholder="e.g. Priya Sharma" value={clientName} onChangeText={setClientName} />
        <Input label="Phone (optional)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <Input label="Email (optional)" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <Input
          label="Estimated value (optional)"
          placeholder="0"
          keyboardType="numeric"
          value={estimatedValue}
          onChangeText={setEstimatedValue}
        />
        <Input label="Notes (optional)" value={notes} onChangeText={setNotes} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Add lead"
          onPress={() => {
            if (!clientName.trim()) {
              setError('Client name is required')
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
