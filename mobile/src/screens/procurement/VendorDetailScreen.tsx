import { NestedChrome } from '../../components/NestedChrome'
import { useMemo } from 'react'
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '../../components/Button'
import { Pill } from '../../components/Badge'
import { SurfaceCard } from '../../components/SurfaceCard'
import { SectionLabel } from '../../components/SectionLabel'
import { LoadingState, ErrorState } from '../../components/States'
import { formatInr, radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { vendorsApi, purchaseOrdersApi } from '../../api/procurement'
import { isApiError } from '../../api/client'
import { telLink, whatsappLink } from '../../utils/phone'
import { vendorHelloEmailDraft } from '../../lib/composeEmail'
import type { POStatus } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'VendorDetail'>

function statusColorMap(c: AppColors): Record<POStatus, string> {
  return {
    draft: c.textMuted,
    approved: c.accent,
    ordered: c.accent,
    in_transit: c.warning,
    delivered: c.success,
  }
}

export function VendorDetailScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { vendorId } = route.params

  const vendorQuery = useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: async () => {
      const vendors = await vendorsApi.list()
      const found = vendors.find((v) => v._id === vendorId)
      if (!found) throw new Error('Vendor not found')
      return found
    },
  })

  const posQuery = useQuery({
    queryKey: ['purchase-orders', 'vendor', vendorId],
    queryFn: async () => {
      const orders = await purchaseOrdersApi.list()
      return orders.filter((po) => {
        const vid = typeof po.vendor === 'object' ? po.vendor?._id : po.vendor
        return vid === vendorId
      })
    },
  })

  const chromeProps = {
    title: vendorQuery.data?.name || 'Vendor',
    subtitle: "Supplier profile",
    subtitleIcon: 'business-outline' as const,
  }

  if (vendorQuery.isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading vendor…" variant="detail" />
      </NestedChrome>
    )
  }
  if (vendorQuery.isError || !vendorQuery.data) {
    return (
      <NestedChrome {...chromeProps}>
      <ErrorState
          message={isApiError(vendorQuery.error) ? vendorQuery.error.message : undefined}
          onRetry={() => vendorQuery.refetch()}
        />
      </NestedChrome>
    )
  }

  const vendor = vendorQuery.data

  return (
    <NestedChrome {...chromeProps}>
      <FlatList
        data={posQuery.data ?? []}
        keyExtractor={(po) => po._id}
        contentContainerStyle={listContent}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <SurfaceCard style={styles.profileCard}>
              <View style={styles.cardTop}>
                <Text style={styles.name}>{vendor.name}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color={colors.warning} />
                  <Text style={styles.rating}>{vendor.rating ?? 4}</Text>
                </View>
              </View>
              {vendor.contact || vendor.phone ? (
                <Text style={styles.meta}>{[vendor.contact, vendor.phone].filter(Boolean).join(' · ')}</Text>
              ) : null}
              {vendor.email ? <Text style={styles.meta}>{vendor.email}</Text> : null}
              {vendor.gst ? <Text style={styles.meta}>GST {vendor.gst}</Text> : null}
              {vendor.categories?.length ? (
                <Text style={styles.categories}>{vendor.categories.join(', ')}</Text>
              ) : null}
              <Text style={styles.terms}>{vendor.paymentTerms || 'Net 30'}</Text>
              <View style={styles.actions}>
                {vendor.phone ? (
                  <>
                    <Pressable style={styles.actionBtn} onPress={() => Linking.openURL(telLink(vendor.phone!))}>
                      <Ionicons name="call-outline" size={14} color={colors.accent} />
                      <Text style={styles.actionText}>Call</Text>
                    </Pressable>
                    <Pressable style={styles.actionBtn} onPress={() => Linking.openURL(whatsappLink(vendor.phone!))}>
                      <Ionicons name="logo-whatsapp" size={14} color={colors.success} />
                      <Text style={styles.actionText}>WhatsApp</Text>
                    </Pressable>
                  </>
                ) : null}
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('ComposeEmail', vendorHelloEmailDraft(vendor))}
                >
                  <Ionicons name="mail-outline" size={14} color={colors.accent} />
                  <Text style={styles.actionText}>Email</Text>
                </Pressable>
              </View>
              <Button title="Edit vendor" size="sm" onPress={() => navigation.navigate('EditVendor', { vendorId })} />
            </SurfaceCard>
            <SectionLabel count={posQuery.data?.length}>Purchase orders</SectionLabel>
            {posQuery.isLoading ? <LoadingState label="Loading orders…" variant="list" /> : null}
          </View>
        }
        renderItem={({ item }) => {
          const pName = typeof item.projectId === 'object' ? item.projectId?.name : undefined
          return (
            <Pressable onPress={() => navigation.navigate('PurchaseOrderDetail', { poId: item._id })}>
              <SurfaceCard>
                <View style={styles.poRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.poNumber} numberOfLines={1}>
                      {item.poNumber}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {[pName, formatInr(item.value)].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Pill
                    label={item.status.replace('_', ' ')}
                    color={statusColorMap(colors)[item.status]}
                    bg={`${statusColorMap(colors)[item.status]}22`}
                  />
                </View>
              </SurfaceCard>
            </Pressable>
          )
        }}
        ListEmptyComponent={
          !posQuery.isLoading ? (
            <Text style={styles.empty}>No purchase orders with this vendor yet.</Text>
          ) : null
        }
      />
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    headerBlock: { gap: spacing.md },
    profileCard: { gap: spacing.sm },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { ...typography.h3, color: c.textPrimary, flexShrink: 1 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    rating: { ...typography.caption, color: c.textSecondary },
    meta: { ...typography.caption, color: c.textSecondary },
    categories: { ...typography.caption, color: c.accent },
    terms: { ...typography.micro, color: c.textMuted },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.surfaceRaised,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.full,
    },
    actionText: { ...typography.micro, color: c.textSecondary },
    poRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    poNumber: { ...typography.bodyStrong, color: c.textPrimary },
    empty: { ...typography.caption, color: c.textMuted, textAlign: 'center', paddingVertical: spacing.lg },
  })
}
