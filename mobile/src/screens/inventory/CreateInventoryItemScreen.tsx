import { useMemo, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { inventoryApi } from '../../api/inventory'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'CreateInventoryItem'>

export function CreateInventoryItemScreen({ navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [quantity, setQuantity] = useState('')
  const [reorderLevel, setReorderLevel] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      inventoryApi.createItem({
        name: name.trim(),
        category: category.trim() || undefined,
        unit: unit.trim() || 'pcs',
        quantity: quantity.trim() ? Number(quantity) : undefined,
        reorderLevel: reorderLevel.trim() ? Number(reorderLevel) : undefined,
        unitCost: unitCost.trim() ? Number(unitCost) : undefined,
        location: location.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] })
      navigation.goBack()
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not add item'),
  })

  return (
    <FormLayout
      title="New item"
      subtitle="Add stock to inventory"
      subtitleIcon="cube-outline"

      footer={
        <Button
          title="Add item"
          onPress={() => {
            if (!name.trim()) {
              setError('Item name is required')
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
      <Input label="Item name" value={name} onChangeText={setName} />
      <Input label="Category (optional)" value={category} onChangeText={setCategory} />
      <Input label="Unit" value={unit} onChangeText={setUnit} />
      <Input
        label="Quantity (optional)"
        keyboardType="decimal-pad"
        value={quantity}
        onChangeText={setQuantity}
      />
      <Input
        label="Reorder level (optional)"
        keyboardType="decimal-pad"
        value={reorderLevel}
        onChangeText={setReorderLevel}
      />
      <Input
        label="Unit cost (optional)"
        keyboardType="decimal-pad"
        value={unitCost}
        onChangeText={setUnitCost}
      />
      <Input label="Location (optional)" value={location} onChangeText={setLocation} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    error: { ...typography.caption, color: c.danger },
  })
}
