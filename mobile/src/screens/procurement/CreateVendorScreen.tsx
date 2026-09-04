import { useMemo, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { CollapsibleSection } from '../../components/CollapsibleSection'
import { FieldRow } from '../../components/FieldRow'
import { Button } from '../../components/Button'
import { typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { vendorsApi } from '../../api/procurement'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'CreateVendor'>

export function CreateVendorScreen({ navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
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
    <FormLayout
      title="New vendor"
      subtitle="Add a supplier to your directory"
      subtitleIcon="storefront-outline"

      footer={
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
      }
    >
      <Input label="Vendor name" value={name} onChangeText={setName} />
      {/* Only the name is required, so the contact block starts collapsed. */}
      <CollapsibleSection>
        <Input label="Contact person" value={contact} onChangeText={setContact} />
        <FieldRow>
          <Input label="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <Input
            label="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </FieldRow>
        <Input label="GSTIN" autoCapitalize="characters" value={gst} onChangeText={setGst} />
      </CollapsibleSection>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    error: { ...typography.caption, color: c.danger },
  })
}
