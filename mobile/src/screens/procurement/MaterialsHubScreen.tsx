import { NestedChrome } from '../../components/NestedChrome'
import { useMemo, useState } from 'react'
import { FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Fab } from '../../components/Fab'
import { Pill } from '../../components/Badge'
import { SurfaceCard } from '../../components/SurfaceCard'
import { ProcurementTabs, type ProcurementTab } from '../../components/ProcurementTabs'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { rfqsApi } from '../../api/rfq'
import { purchaseOrdersApi } from '../../api/procurement'
import { isApiError } from '../../api/client'
import { poWhatsappLink } from '../../utils/phone'
import type { POStatus, RfqStatus } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'MaterialsHub'>

function poStatusColorMap(c: AppColors): Record<POStatus, string> {
  return {
    draft: c.textMuted,
    approved: c.accent,
    ordered: c.accent,
    in_transit: c.warning,
    delivered: c.success,
  }
}

function rfqStatusColorMap(c: AppColors): Record<RfqStatus, string> {
  return {
    draft: c.textMuted,
    sent: c.accent,
    comparing: c.warning,
    awarded: c.success,
    cancelled: c.danger,
  }
}

export function MaterialsHubScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [tab, setTab] = useState<ProcurementTab>(route.params?.tab ?? 'rfqs')

  const rfqsQuery = useQuery({
    queryKey: ['rfqs', 'hub'],
    queryFn: () => rfqsApi.list(),
    enabled: tab === 'rfqs',
  })

  const posQuery = useQuery({
    queryKey: ['purchase-orders', 'hub'],
    queryFn: () => purchaseOrdersApi.list(),
    enabled: tab === 'pos',
  })

  const handleTabChange = (next: ProcurementTab) => {
    if (next === 'vendors') {
      navigation.navigate('Vendors')
      return
    }
    setTab(next)
  }

  const chromeProps = {
    title: "Materials",
    subtitle: "RFQs, orders & vendors",
    subtitleIcon: 'cube-outline' as const,
  }

  const tabs = (
    <View style={listContent}>
      <ProcurementTabs value={tab} onChange={handleTabChange} />
    </View>
  )

  if (tab === 'rfqs') {
    const { data, isLoading, isError, error, refetch, isRefetching } = rfqsQuery
    return (
      <NestedChrome {...chromeProps}>
      {tabs}
        {isLoading ? (
          <LoadingState label="Loading RFQs…" variant="list" />
        ) : isError ? (
          <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(rfq) => rfq._id}
            contentContainerStyle={listContent}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
            renderItem={({ item }) => {
              const pName = typeof item.projectId === 'object' ? item.projectId?.name : undefined
              return (
                <Pressable onPress={() => navigation.navigate('RfqDetail', { rfqId: item._id })}>
                  <SurfaceCard>
                    <View style={styles.cardInner}>
                      <View style={styles.cardTop}>
                        <Text style={styles.title} numberOfLines={1}>
                          {item.rfqNumber}
                        </Text>
                        <Pill
                          label={item.status}
                          color={rfqStatusColorMap(colors)[item.status]}
                          bg={`${rfqStatusColorMap(colors)[item.status]}22`}
                        />
                      </View>
                      <Text style={styles.meta} numberOfLines={1}>
                        {[pName, `${item.items.length} items`, `${item.vendors.length} vendors`].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  </SurfaceCard>
                </Pressable>
              )
            }}
            ListEmptyComponent={
              <EmptyState
                title="No RFQs yet"
                body="Request quotes from vendors for project materials."
                action="New RFQ"
                onAction={() => navigation.navigate('CreateRfq', { projectId: '' })}
              />
            }
          />
        )}
        <Fab label="New RFQ" onPress={() => navigation.navigate('CreateRfq', { projectId: '' })} />
      </NestedChrome>
    )
  }

  const { data, isLoading, isError, error, refetch, isRefetching } = posQuery
  return (
    <NestedChrome {...chromeProps}>
      {tabs}
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
              <Pressable onPress={() => navigation.navigate('PurchaseOrderDetail', { poId: item._id })}>
                <SurfaceCard>
                  <View style={styles.cardInner}>
                    <View style={styles.cardTop}>
                      <Text style={styles.title} numberOfLines={1}>
                        {item.poNumber}
                      </Text>
                      <Pill
                        label={item.status.replace('_', ' ')}
                        color={poStatusColorMap(colors)[item.status]}
                        bg={`${poStatusColorMap(colors)[item.status]}22`}
                      />
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
              </Pressable>
            )
          }}
          ListEmptyComponent={
            <EmptyState
              title="No purchase orders yet"
              body="Raise a PO once BOQ items are approved."
              action="New purchase order"
              onAction={() => navigation.navigate('CreatePurchaseOrder')}
            />
          }
        />
      )}
      <Fab label="New purchase order" onPress={() => navigation.navigate('CreatePurchaseOrder')} />
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    cardInner: { gap: 4 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    title: { ...typography.bodyStrong, color: c.textPrimary },
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
