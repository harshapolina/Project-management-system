import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { vendorsApi } from '../../api/procurement'
import { isApiError } from '../../api/client'
import { telLink, whatsappLink } from '../../utils/phone'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'Vendors'>

export function VendorsScreen({ navigation }: Props) {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: ['vendors'], queryFn: vendorsApi.list })

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading vendors…" />
      </Screen>
    )
  }
  if (isError) {
    return (
      <Screen>
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={data}
        keyExtractor={(v) => v._id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
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
        )}
        ListEmptyComponent={<EmptyState title="No vendors yet" body="Add suppliers to raise purchase orders against them." />}
      />
      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('CreateVendor')}
        accessibilityLabel="Add vendor"
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { ...typography.caption, color: colors.textSecondary },
  meta: { ...typography.caption, color: colors.textSecondary },
  categories: { ...typography.caption, color: colors.accent },
  terms: { ...typography.micro, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  actionText: { ...typography.micro, color: colors.textSecondary },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
})
