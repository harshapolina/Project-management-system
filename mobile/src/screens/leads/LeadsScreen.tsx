import { useState } from 'react'
import { Alert, FlatList, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { Pill } from '../../components/Badge'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, formatInr, radius, spacing, stageLabel, typography } from '../../constants/theme'
import { leadsApi } from '../../api/leads'
import { adminApi } from '../../api/admin'
import { isApiError } from '../../api/client'
import { telLink, whatsappLink } from '../../utils/phone'
import type { LeadStage } from '../../types/ops'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'Leads'>

const STAGE_COLOR: Record<LeadStage, string> = {
  new_enquiry: colors.textMuted,
  site_visit: colors.accent,
  quotation_sent: colors.warning,
  negotiation: colors.warning,
  won: colors.success,
  lost: colors.danger,
}

const STAGE_ORDER: LeadStage[] = ['new_enquiry', 'site_visit', 'quotation_sent', 'negotiation', 'won', 'lost']

export function LeadsScreen({ navigation }: Props) {
  const queryClient = useQueryClient()
  const [busyId, setBusyId] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['leads'],
    queryFn: leadsApi.list,
  })
  const users = useQuery({ queryKey: ['users'], queryFn: adminApi.users })

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: LeadStage }) => leadsApi.update(id, { stage }),
    onSettled: () => {
      setBusyId(null)
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })

  const assignMutation = useMutation({
    mutationFn: ({ id, owner }: { id: string; owner: string | null }) => leadsApi.update(id, { owner }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  })

  const convertMutation = useMutation({
    mutationFn: (id: string) => leadsApi.convert(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      Alert.alert('Converted', `${result.project.name} was created from this lead.`)
    },
    onError: (err) => Alert.alert('Could not convert lead', isApiError(err) ? err.message : 'Try again'),
    onSettled: () => setBusyId(null),
  })

  const nextStage = (stage: LeadStage): LeadStage | null => {
    const idx = STAGE_ORDER.indexOf(stage)
    if (idx < 0 || idx >= STAGE_ORDER.length - 3) return null
    return STAGE_ORDER[idx + 1]
  }

  return (
    <Screen padded={false}>
      {isLoading ? (
        <LoadingState label="Loading enquiries…" />
      ) : isError ? (
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(l) => l._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
          renderItem={({ item }) => {
            const next = nextStage(item.stage)
            const ownerId = item.owner?._id
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.clientName}
                  </Text>
                  <Pill label={stageLabel(item.stage)} color={STAGE_COLOR[item.stage]} bg={`${STAGE_COLOR[item.stage]}22`} />
                </View>
                {item.phone || item.email ? (
                  <Text style={styles.meta} numberOfLines={1}>
                    {[item.phone, item.email].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
                {item.phone ? (
                  <View style={styles.contactRow}>
                    <Pressable style={styles.contactBtn} onPress={() => Linking.openURL(telLink(item.phone))}>
                      <Ionicons name="call-outline" size={14} color={colors.accent} />
                      <Text style={styles.contactText}>Call</Text>
                    </Pressable>
                    <Pressable
                      style={styles.contactBtn}
                      onPress={() =>
                        Linking.openURL(
                          whatsappLink(item.phone, `Hi ${item.clientName}, following up on your enquiry.`),
                        )
                      }
                    >
                      <Ionicons name="logo-whatsapp" size={14} color={colors.success} />
                      <Text style={styles.contactText}>WhatsApp</Text>
                    </Pressable>
                  </View>
                ) : null}
                <Text style={styles.value}>{formatInr(item.estimatedValue)} estimated</Text>

                <Text style={styles.assignLabel}>Assign employee</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {(users.data || []).map((u) => {
                    const active = ownerId === u._id
                    return (
                      <Pressable
                        key={u._id}
                        onPress={() => assignMutation.mutate({ id: item._id, owner: active ? null : u._id })}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                          {u.name}
                        </Text>
                      </Pressable>
                    )
                  })}
                </ScrollView>

                <View style={styles.actions}>
                  {next ? (
                    <Pressable
                      style={styles.actionBtn}
                      disabled={busyId === item._id}
                      onPress={() => {
                        setBusyId(item._id)
                        stageMutation.mutate({ id: item._id, stage: next })
                      }}
                    >
                      <Text style={styles.actionText}>Move to {stageLabel(next)}</Text>
                    </Pressable>
                  ) : null}
                  {item.stage !== 'won' && item.stage !== 'lost' ? (
                    <Pressable
                      style={[styles.actionBtn, styles.convertBtn]}
                      disabled={busyId === item._id}
                      onPress={() => {
                        setBusyId(item._id)
                        convertMutation.mutate(item._id)
                      }}
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                      <Text style={[styles.actionText, { color: colors.success }]}>Convert to project</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            )
          }}
          ListEmptyComponent={<EmptyState title="No enquiries yet" body="New client enquiries will show up here." />}
        />
      )}

      <Pressable style={styles.fab} onPress={() => navigation.navigate('CreateLead')} accessibilityLabel="Add enquiry">
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  meta: { ...typography.caption, color: colors.textSecondary },
  value: { ...typography.captionStrong, color: colors.accent },
  contactRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  contactText: { ...typography.micro, color: colors.textSecondary },
  assignLabel: { ...typography.micro, color: colors.textMuted, marginTop: 8 },
  chips: { gap: 8, paddingVertical: 4 },
  chip: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  chipActive: { backgroundColor: colors.textPrimary },
  chipText: { ...typography.micro, color: colors.textSecondary, maxWidth: 120 },
  chipTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  convertBtn: { backgroundColor: colors.successSoft },
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
