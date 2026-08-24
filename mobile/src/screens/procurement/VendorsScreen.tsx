import { useMemo } from 'react'
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { PageHeader } from '../../components/PageHeader'
import { Fab } from '../../components/Fab'
import { SurfaceCard } from '../../components/SurfaceCard'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { vendorsApi } from '../../api/procurement'
import { isApiError } from '../../api/client'
import { telLink, whatsappLink } from '../../utils/phone'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'Vendors'>

export function VendorsScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['vendors'], queryFn: vendorsApi.list })

  const pageHeader = (
    <PageHeader
      title="Vendors"
      subtitle="Supplier directory"
      subtitleIcon="business-outline"
      onBack={() => navigation.goBack()}
    />
  )

  if (isLoading) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']}>
        {pageHeader}
        <LoadingState label="Loading vendors…" variant="list" />
      </Screen>
    )
  }
  if (isError) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']}>
        {pageHeader}
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  return (
    <Screen padded={false} edges={['top', 'left', 'right']}>
      {pageHeader}
      <FlatList
        data={data}
        keyExtractor={(v) => v._id}
        contentContainerStyle={listContent}
        renderItem={({ item }) => (
          <SurfaceCard>
            <View style={styles.cardInner}>
              <View style={styles.cardTop}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color={colors.warning} />
                  <Text style={styles.rating}>{item.rating ?? 4}</Text>
                </View>
              </View>
              {item.contact || item.phone ? (
                <Text style={styles.meta} numberOfLines={1}>
                  {[item.contact, item.phone].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
              {item.categories?.length ? (
                <Text style={styles.categories} numberOfLines={1}>
                  {item.categories.join(', ')}
                </Text>
              ) : null}
              {item.gst ? <Text style={styles.terms}>GST {item.gst}</Text> : null}
              <Text style={styles.terms}>{item.paymentTerms || 'Net 30'}</Text>
              {item.phone ? (
                <View style={styles.actions}>
                  <Pressable style={styles.actionBtn} onPress={() => Linking.openURL(telLink(item.phone))}>
                    <Ionicons name="call-outline" size={14} color={colors.accent} />
                    <Text style={styles.actionText}>Call</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => Linking.openURL(whatsappLink(item.phone))}>
                    <Ionicons name="logo-whatsapp" size={14} color={colors.success} />
                    <Text style={styles.actionText}>WhatsApp</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </SurfaceCard>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No vendors yet"
            body="Add suppliers to raise purchase orders against them."
            action="Add vendor"
            onAction={() => navigation.navigate('CreateVendor')}
          />
        }
      />
      <Fab label="Add vendor" onPress={() => navigation.navigate('CreateVendor')} />
    </Screen>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    cardInner: { gap: 4 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    name: { ...typography.bodyStrong, color: c.textPrimary, flexShrink: 1 },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    rating: { ...typography.caption, color: c.textSecondary },
    meta: { ...typography.caption, color: c.textSecondary },
    categories: { ...typography.caption, color: c.accent },
    terms: { ...typography.micro, color: c.textMuted },
    actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
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
  })
}
