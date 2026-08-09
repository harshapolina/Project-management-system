import { useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { ProjectPicker } from '../../components/ProjectPicker'
import { VendorPicker } from '../../components/VendorPicker'
import { colors, spacing, typography } from '../../constants/theme'
import { purchaseOrdersApi } from '../../api/procurement'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { SharedOpsParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<SharedOpsParamList, 'CreatePurchaseOrder'>

export function CreatePurchaseOrderScreen({ route, navigation }: Props) {
  const params = route.params || {}
  const queryClient = useQueryClient()
  const [projectId, setProjectId] = useState(params.projectId)
  const [vendor, setVendor] = useState<string | undefined>(undefined)
  const [description, setDescription] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      purchaseOrdersApi.create({
        projectId: projectId!,
        vendor,
        value: Number(value) || 0,
        items: description.trim()
          ? [{ description: description.trim(), qty: 1, rate: Number(value) || 0, amount: Number(value) || 0 }]
          : [],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      navigation.goBack()
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not create purchase order'),
  })

  return (
    <Screen keyboardAvoiding>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        {!params.projectId ? <ProjectPicker value={projectId} onChange={(id) => setProjectId(id)} /> : null}
        <VendorPicker value={vendor} onChange={setVendor} />
        <Input label="Description (optional)" value={description} onChangeText={setDescription} />
        <Input label="Order value" placeholder="0" keyboardType="numeric" value={value} onChangeText={setValue} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Create purchase order"
          onPress={() => {
            if (!projectId) {
              setError('Select a project')
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
