import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { leadsApi } from '../../api/leads'
import { adminApi } from '../../api/admin'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'CreateLead'>

export function CreateLeadScreen({ navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
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
    <FormLayout
      title="New enquiry"
      subtitle="Capture a lead and assign follow-up"
      subtitleIcon="people-outline"

      footer={
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
      }
    >
      <Input label="Client name" placeholder="e.g. Priya Sharma" value={clientName} onChangeText={setClientName} />
      <Input label="Phone (optional)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <Input
        label="Email (optional)"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        label="Estimated value (optional)"
        placeholder="0"
        keyboardType="numeric"
        value={estimatedValue}
        onChangeText={setEstimatedValue}
      />
      <Input
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />
      <View>
        <Text style={styles.label}>Assign employee (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {(users.data || []).map((u) => {
            const active = owner === u._id
            return (
              <Pressable
                key={u._id}
                onPress={() => setOwner(active ? '' : u._id)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{u.name}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    error: { ...typography.caption, color: c.danger },
    label: { ...typography.captionStrong, color: c.textSecondary, marginBottom: spacing.sm },
    chips: { gap: 8, paddingVertical: 2 },
    chip: {
      backgroundColor: c.surfaceRaised,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.full,
    },
    chipActive: { backgroundColor: c.textPrimary },
    chipText: { ...typography.caption, color: c.textSecondary },
    chipTextActive: { color: c.canvas },
  })
}
