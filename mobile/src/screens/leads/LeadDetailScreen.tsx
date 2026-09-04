import { NestedChrome } from '../../components/NestedChrome'
import { useMemo, useState } from 'react'
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Pill } from '../../components/Badge'
import { Button } from '../../components/Button'
import { LoadingState, ErrorState } from '../../components/States'
import { formatInr, radius, spacing, stageLabel, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { leadsApi } from '../../api/leads'
import { adminApi } from '../../api/admin'
import { isApiError } from '../../api/client'
import { telLink, whatsappLink } from '../../utils/phone'
import type { LeadStage } from '../../types/ops'
import type { MoreStackParamList, RootTabParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'LeadDetail'>
type Nav = CompositeNavigationProp<
  Props['navigation'],
  BottomTabNavigationProp<RootTabParamList>
>

const STAGE_ORDER: LeadStage[] = [
  'new_enquiry',
  'site_visit',
  'quotation_sent',
  'negotiation',
  'mood_board',
  'hot',
  'dead',
]

function stageColorMap(c: AppColors): Record<LeadStage, string> {
  return {
    new_enquiry: c.textMuted,
    site_visit: c.accent,
    quotation_sent: c.warning,
    negotiation: c.warning,
    mood_board: c.accent,
    hot: c.success,
    dead: c.danger,
    won: c.success,
    lost: c.danger,
  }
}

function nextStage(stage: LeadStage): LeadStage | null {
  // `won`/`lost` are the legacy names for hot/dead — normalise before ordering.
  const normalized = stage === 'won' ? 'hot' : stage === 'lost' ? 'dead' : stage
  const idx = STAGE_ORDER.indexOf(normalized)
  // Stop before hot/dead — those are explicit actions
  if (idx < 0 || idx >= STAGE_ORDER.indexOf('hot') - 1) return null
  return STAGE_ORDER[idx + 1]
}

export function LeadDetailScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const tabNav = navigation as unknown as Nav
  const queryClient = useQueryClient()
  const { leadId } = route.params
  const [busy, setBusy] = useState(false)

  const { data: lead, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => leadsApi.get(leadId),
  })
  const users = useQuery({ queryKey: ['users'], queryFn: adminApi.users })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
    queryClient.invalidateQueries({ queryKey: ['leads'] })
  }

  const stageMutation = useMutation({
    mutationFn: (stage: LeadStage) => leadsApi.update(leadId, { stage }),
    onSettled: () => {
      setBusy(false)
      invalidate()
    },
  })

  const assignMutation = useMutation({
    mutationFn: (owner: string | null) => leadsApi.update(leadId, { owner }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    onSettled: invalidate,
  })

  const convertMutation = useMutation({
    mutationFn: () => leadsApi.convert(leadId),
    onSuccess: (result) => {
      invalidate()
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      if (result.project?._id) {
        Alert.alert('Converted', `${result.project.name} was created from this enquiry.`, [
          {
            text: 'Open project',
            onPress: () =>
              tabNav.navigate('Projects', {
                screen: 'ProjectOverview',
                params: { projectId: result.project._id, projectName: result.project.name },
              }),
          },
          { text: 'OK' },
        ])
      } else {
        Alert.alert('Converted', 'This enquiry was already converted to a project.')
      }
    },
    onError: (err) => Alert.alert('Could not convert', isApiError(err) ? err.message : 'Try again'),
    onSettled: () => setBusy(false),
  })

  const removeMutation = useMutation({
    mutationFn: () => leadsApi.remove(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      navigation.goBack()
    },
    onError: (err) => Alert.alert('Could not delete', isApiError(err) ? err.message : 'Try again'),
  })

  const chromeProps = {
    title: lead?.clientName || 'Enquiry',
    subtitle: "Lead details",
    subtitleIcon: 'briefcase-outline' as const,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading enquiry…" variant="detail" />
      </NestedChrome>
    )
  }
  if (isError || !lead) {
    return (
      <NestedChrome {...chromeProps}>
      <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  const ownerId = lead.owner?._id
  const stageColor = stageColorMap(colors)[lead.stage]
  const advance = nextStage(lead.stage)
  const canConvert = lead.stage !== 'won' && lead.stage !== 'lost' && !lead.convertedProjectId

  return (
    <NestedChrome {...chromeProps}>
      <ScrollView contentContainerStyle={listContent}>
        <SurfaceCard>
          <View style={styles.topRow}>
            <Text style={styles.name}>{lead.clientName}</Text>
            <Pill label={stageLabel(lead.stage)} color={stageColor} bg={`${stageColor}22`} />
          </View>
          {lead.contactName ? <Text style={styles.meta}>Contact: {lead.contactName}</Text> : null}
          {lead.phone ? <Text style={styles.meta}>{lead.phone}</Text> : null}
          {lead.email ? <Text style={styles.meta}>{lead.email}</Text> : null}
          {lead.source ? <Text style={styles.meta}>Source: {lead.source}</Text> : null}
          <Text style={styles.value}>{formatInr(lead.estimatedValue)} estimated</Text>
          {lead.notes ? (
            <>
              <SectionLabel>Notes</SectionLabel>
              <Text style={styles.notes}>{lead.notes}</Text>
            </>
          ) : null}
        </SurfaceCard>

        {lead.phone ? (
          <SurfaceCard>
            <SectionLabel>Contact</SectionLabel>
            <View style={styles.contactRow}>
              <Pressable style={styles.contactBtn} onPress={() => Linking.openURL(telLink(lead.phone))}>
                <Ionicons name="call-outline" size={16} color={colors.accent} />
                <Text style={styles.contactText}>Call</Text>
              </Pressable>
              <Pressable
                style={styles.contactBtn}
                onPress={() =>
                  Linking.openURL(
                    whatsappLink(lead.phone, `Hi ${lead.clientName}, following up on your enquiry.`),
                  )
                }
              >
                <Ionicons name="logo-whatsapp" size={16} color={colors.success} />
                <Text style={styles.contactText}>WhatsApp</Text>
              </Pressable>
            </View>
          </SurfaceCard>
        ) : null}

        <SurfaceCard>
          <SectionLabel>Stage</SectionLabel>
          <View style={styles.actions}>
            {advance ? (
              <Pressable
                style={styles.actionBtn}
                disabled={busy}
                onPress={() => {
                  setBusy(true)
                  stageMutation.mutate(advance)
                }}
              >
                <Text style={styles.actionText}>Move to {stageLabel(advance)}</Text>
              </Pressable>
            ) : null}
            {lead.stage !== 'won' && lead.stage !== 'lost' ? (
              <>
                <Pressable
                  style={[styles.actionBtn, styles.wonBtn]}
                  disabled={busy}
                  onPress={() => {
                    setBusy(true)
                    stageMutation.mutate('won')
                  }}
                >
                  <Text style={[styles.actionText, { color: colors.success }]}>Mark won</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.lostBtn]}
                  disabled={busy}
                  onPress={() => {
                    setBusy(true)
                    stageMutation.mutate('lost')
                  }}
                >
                  <Text style={[styles.actionText, { color: colors.danger }]}>Mark lost</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <SectionLabel>Assign employee</SectionLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {(users.data || []).map((u) => {
              const active = ownerId === u._id
              return (
                <Pressable
                  key={u._id}
                  onPress={() => assignMutation.mutate(active ? null : u._id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                    {u.name}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </SurfaceCard>

        {canConvert ? (
          <Button
            title="Convert to project"
            onPress={() => {
              setBusy(true)
              convertMutation.mutate()
            }}
            loading={convertMutation.isPending}
            fullWidth
          />
        ) : null}

        {!lead.convertedProjectId ? (
          <Button
            title="Delete enquiry"
            variant="secondary"
            onPress={() =>
              Alert.alert('Delete enquiry', `Remove ${lead.clientName}?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => removeMutation.mutate() },
              ])
            }
            loading={removeMutation.isPending}
            fullWidth
          />
        ) : null}
      </ScrollView>
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    name: { ...typography.h3, color: c.textPrimary, flexShrink: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
    value: { ...typography.bodyStrong, color: c.accent, marginTop: spacing.sm },
    notes: { ...typography.body, color: c.textPrimary },
    contactRow: { flexDirection: 'row', gap: spacing.sm },
    contactBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.surfaceRaised,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
    },
    contactText: { ...typography.caption, color: c.textSecondary },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    actionBtn: {
      backgroundColor: c.surfaceRaised,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.full,
    },
    wonBtn: { backgroundColor: c.successSoft },
    lostBtn: { backgroundColor: c.dangerSoft },
    actionText: { ...typography.caption, color: c.textSecondary },
    chips: { gap: 8, paddingVertical: 4 },
    chip: {
      backgroundColor: c.surfaceRaised,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.full,
    },
    chipActive: { backgroundColor: c.textPrimary },
    chipText: { ...typography.caption, color: c.textSecondary, maxWidth: 140 },
    chipTextActive: { color: c.canvas },
  })
}
