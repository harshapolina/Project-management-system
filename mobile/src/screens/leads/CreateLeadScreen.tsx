import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { leadsApi } from '../../api/leads'
import { adminApi } from '../../api/admin'
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
  const [owner, setOwner] = useState('')
  const [error, setError] = useState('')
  const users = useQuery({ queryKey: ['users'], queryFn: adminApi.users })

  const mutation = useMutation({
    mutationFn: () =>
      leadsApi.create({
        clientName: clientName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        estimatedValue: estimatedValue ? Number(estimatedValue) : undefined,
        notes: notes.trim() || undefined,
        owner: owner || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
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
        <Text style={styles.label}>Assign employee (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {(users.data || []).map((u) => {
            const active = owner === u._id
            return (
              <Pressable key={u._id} onPress={() => setOwner(active ? '' : u._id)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{u.name}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Add enquiry"
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
  label: { ...typography.captionStrong, color: colors.textSecondary },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  chipActive: { backgroundColor: colors.textPrimary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
})
