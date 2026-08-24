import { useMemo } from 'react'
import { FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { AppNavBar } from '../../components/AppNavBar'
import { PageHeader } from '../../components/PageHeader'
import { Fab } from '../../components/Fab'
import { Pill } from '../../components/Badge'
import { SurfaceCard } from '../../components/SurfaceCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { purchaseOrdersApi } from '../../api/procurement'
import { isApiError } from '../../api/client'
import { poWhatsappLink } from '../../utils/phone'
import type { POStatus } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { SharedOpsParamList } from '../../navigation/types'
import { goBackOrHome } from '../../navigation/openProject'

type Props = NativeStackScreenProps<SharedOpsParamList, 'PurchaseOrders'>

function statusColorMap(c: AppColors): Record<POStatus, string> {
  return {
    draft: c.textMuted,
    approved: c.accent,
    ordered: c.accent,
    in_transit: c.warning,
    delivered: c.success,
  }
}

export function PurchaseOrdersScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { projectId, projectName } = route.params || {}

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['purchase-orders', projectId ?? 'all'],
    queryFn: () => purchaseOrdersApi.list(projectId ? { projectId } : undefined),
  })

  const pageHeader = (
    <>
      <AppNavBar />
    <PageHeader
      title="Purchase orders"
      subtitle="Material orders"
      subtitleIcon="cart-outline"
      onBack={() => goBackOrHome(navigation, route)}
    />
    </>
  )

  return (
    <Screen padded={false} edges={['left', 'right']}>
      {pageHeader}
      {isLoading ? (
        <LoadingState label="Loading purchase orders…" variant="list" />
      ) : isError ? (
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(po) => po._id}
          contentContainerStyle={listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          renderItem={({ item }) => {
            const vendorName = typeof item.vendor === 'object' ? item.vendor?.name : undefined
            const pName = typeof item.projectId === 'object' ? item.projectId?.name : undefined
            return (
              <SurfaceCard>
                <View style={styles.cardInner}>
                  <View style={styles.cardTop}>
                    <Text style={styles.poNumber} numberOfLines={1}>
                      {item.poNumber}
                    </Text>
                    <Pill label={item.status.replace('_', ' ')} color={statusColorMap(colors)[item.status]} bg={`${statusColorMap(colors)[item.status]}22`} />
                  </View>
                  <Text style={styles.meta} numberOfLines={1}>
                    {[vendorName, pName].filter(Boolean).join(' · ') || 'No vendor set'}
                  </Text>
                  <Text style={styles.value}>{formatInr(item.value)}</Text>
                  {poWhatsappLink(item) ? (
                    <Pressable style={styles.waBtn} onPress={() => Linking.openURL(poWhatsappLink(item))}>
                      <Ionicons name="logo-whatsapp" size={14} color={colors.success} />
                      <Text style={styles.waText}>Send on WhatsApp</Text>
                    </Pressable>
                  ) : null}
                </View>
              </SurfaceCard>
            )
          }}
          ListEmptyComponent={
            <EmptyState
              title="No purchase orders yet"
              body="Raise a PO once BOQ items are approved."
              action="New purchase order"
              onAction={() => navigation.navigate('CreatePurchaseOrder', { projectId, projectName })}
            />
          }
        />
      )}
      <Fab
        label="New purchase order"
        onPress={() => navigation.navigate('CreatePurchaseOrder', { projectId, projectName })}
      />
    </Screen>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    cardInner: { gap: 4 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    poNumber: { ...typography.bodyStrong, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textSecondary },
    value: { ...typography.h3, color: c.accent },
    waBtn: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 6,
      backgroundColor: c.successSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.full,
    },
    waText: { ...typography.micro, color: c.success },
  })
}
