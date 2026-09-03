import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { vendorsApi } from '../../api/procurement'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'EditVendor'>

export function EditVendorScreen({ route, navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { vendorId } = route.params
  const queryClient = useQueryClient()
  const [error, setError] = useState('')

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: async () => {
      const vendors = await vendorsApi.list()
      const found = vendors.find((v) => v._id === vendorId)
      if (!found) throw new Error('Vendor not found')
      return found
    },
  })

  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [gst, setGst] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (!vendor || initialized) return
    setName(vendor.name)
    setContact(vendor.contact || '')
    setPhone(vendor.phone || '')
    setEmail(vendor.email || '')
    setGst(vendor.gst || '')
    setPaymentTerms(vendor.paymentTerms || '')
    setInitialized(true)
  }, [vendor, initialized])

  const mutation = useMutation({
    mutationFn: () =>
      vendorsApi.update(vendorId, {
        name: name.trim(),
        contact: contact.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        gst: gst.trim() || undefined,
        paymentTerms: paymentTerms.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
      navigation.goBack()
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not update vendor'),
  })

  if (isLoading || !initialized) {
    return (
      <FormLayout title="Edit vendor" subtitle="Update supplier details" subtitleIcon="business-outline">
        <ActivityIndicator color={colors.accent} />
      </FormLayout>
    )
  }

  return (
    <FormLayout
      title="Edit vendor"
      subtitle="Update supplier details"
      subtitleIcon="business-outline"
      variant="page"

      footer={
        <Button
          title="Save changes"
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
      <Input label="Contact person (optional)" value={contact} onChangeText={setContact} />
      <Input label="Phone (optional)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <Input
        label="Email (optional)"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <Input label="GSTIN (optional)" autoCapitalize="characters" value={gst} onChangeText={setGst} />
      <Input label="Payment terms (optional)" value={paymentTerms} onChangeText={setPaymentTerms} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    error: { ...typography.caption, color: c.danger },
  })
}
