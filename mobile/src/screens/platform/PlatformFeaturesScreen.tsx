import { NestedChrome } from '../../components/NestedChrome'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Button } from '../../components/Button'
import { ErrorState, LoadingState } from '../../components/States'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { platformApi } from '../../api/platform'
import { isApiError } from '../../api/client'
import {
  PLAN_FEATURE_PRESETS,
  PLAN_SEAT_DEFAULTS,
  SUBSCRIPTION_PLANS,
  TENANT_FEATURE_KEYS,
  normalizeTenantFeatures,
  type TenantFeatureKey,
} from '../../utils/tenantFeatures'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PlatformStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<PlatformStackParamList, 'PlatformFeatures'>

export function PlatformFeaturesScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const queryClient = useQueryClient()

  const tenantsQuery = useQuery({
    queryKey: ['platform-tenants'],
    queryFn: platformApi.tenants,
  })

  const [selectedId, setSelectedId] = useState('')
  const [features, setFeatures] = useState<Record<TenantFeatureKey, boolean>>(normalizeTenantFeatures())
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'enterprise'>('pro')

  const tenants = tenantsQuery.data || []
  const selected = tenants.find((t) => t._id === selectedId)

  useEffect(() => {
    if (selected) {
      setFeatures(normalizeTenantFeatures(selected.features))
      setSelectedPlan((selected.subscriptionPlan as typeof selectedPlan) || 'pro')
    }
  }, [selected?._id, selected?.features, selected?.subscriptionPlan])

  const updateMutation = useMutation({
    mutationFn: (payload: { features: Record<TenantFeatureKey, boolean> }) =>
      platformApi.updateTenant(selectedId, { features: payload.features }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['platform-tenant', selectedId] })
    },
    onError: (err) => Alert.alert('Could not save', isApiError(err) ? err.message : 'Try again'),
  })

  const applyPlanMutation = useMutation({
    mutationFn: (plan: 'starter' | 'pro' | 'enterprise') =>
      platformApi.updateTenant(selectedId, {
        subscriptionPlan: plan,
        seatLimit: PLAN_SEAT_DEFAULTS[plan],
        features: PLAN_FEATURE_PRESETS[plan],
      }),
    onSuccess: (_, plan) => {
      setFeatures(PLAN_FEATURE_PRESETS[plan])
      setSelectedPlan(plan)
      queryClient.invalidateQueries({ queryKey: ['platform-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['platform-tenant', selectedId] })
    },
    onError: (err) => Alert.alert('Could not apply plan', isApiError(err) ? err.message : 'Try again'),
  })

  const chromeProps = {
    title: "Feature plans",
    subtitle: "Modules per company",
    subtitleIcon: 'toggle-outline' as const,
  }

  if (tenantsQuery.isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading companies…" variant="list" />
      </NestedChrome>
    )
  }
  if (tenantsQuery.isError) {
    return (
      <NestedChrome {...chromeProps}>
      <ErrorState
          message={isApiError(tenantsQuery.error) ? tenantsQuery.error.message : undefined}
          onRetry={() => tenantsQuery.refetch()}
        />
      </NestedChrome>
    )
  }

  return (
    <NestedChrome {...chromeProps}>
      <ScrollView contentContainerStyle={listContent}>
        <SectionLabel>Plan presets</SectionLabel>
        <View style={styles.planGrid}>
          {SUBSCRIPTION_PLANS.map((p) => (
            <SurfaceCard key={p.value} style={styles.planCard}>
              <Text style={styles.planTitle}>{p.label}</Text>
              <Text style={styles.planMeta}>{PLAN_SEAT_DEFAULTS[p.value]} seats default</Text>
              <Text style={styles.planMeta}>
                {TENANT_FEATURE_KEYS.filter((f) => PLAN_FEATURE_PRESETS[p.value][f.key]).length} modules on
              </Text>
            </SurfaceCard>
          ))}
        </View>

        <SectionLabel>Select company</SectionLabel>
        <View style={styles.tenantPickers}>
          {tenants.map((t) => (
            <Pressable
              key={t._id}
              onPress={() => setSelectedId(t._id)}
              style={[styles.tenantChip, selectedId === t._id && styles.tenantChipActive]}
            >
              <Text style={[styles.tenantChipText, selectedId === t._id && styles.tenantChipTextActive]} numberOfLines={1}>
                {t.name}
              </Text>
            </Pressable>
          ))}
        </View>

        {selected ? (
          <>
            <SectionLabel>{selected.name}</SectionLabel>
            <SurfaceCard style={styles.blockGap}>
              <Text style={styles.subheading}>Apply plan bundle</Text>
              <View style={styles.planActions}>
                {SUBSCRIPTION_PLANS.map((p) => (
                  <Button
                    key={p.value}
                    title={p.label}
                    variant={selectedPlan === p.value ? 'primary' : 'secondary'}
                    onPress={() => applyPlanMutation.mutate(p.value)}
                    loading={applyPlanMutation.isPending}
                  />
                ))}
              </View>
            </SurfaceCard>

            <SectionLabel>Feature toggles</SectionLabel>
            <SurfaceCard style={styles.blockGap}>
              {TENANT_FEATURE_KEYS.map(({ key, label }) => (
                <View key={key} style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>{label}</Text>
                  <Switch
                    value={features[key]}
                    onValueChange={(on) => setFeatures((prev) => ({ ...prev, [key]: on }))}
                    trackColor={{ false: colors.border, true: colors.accentSoft }}
                    thumbColor={features[key] ? colors.accent : colors.textMuted}
                  />
                </View>
              ))}
              <Button
                title="Save features"
                onPress={() => updateMutation.mutate({ features })}
                loading={updateMutation.isPending}
                fullWidth
              />
            </SurfaceCard>
          </>
        ) : (
          <Text style={styles.hint}>Pick a company above to configure its modules.</Text>
        )}
      </ScrollView>
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    planCard: { flexGrow: 1, flexBasis: '30%', minWidth: 100, gap: 2 },
    planTitle: { ...typography.bodyStrong, color: c.textPrimary },
    planMeta: { ...typography.caption, color: c.textSecondary },
    tenantPickers: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    tenantChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      maxWidth: '100%',
    },
    tenantChipActive: { borderColor: c.accent, backgroundColor: c.accentSoft },
    tenantChipText: { ...typography.captionStrong, color: c.textSecondary },
    tenantChipTextActive: { color: c.accent },
    blockGap: { gap: spacing.md },
    subheading: { ...typography.bodyStrong, color: c.textPrimary },
    planActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: 4,
    },
    toggleLabel: { ...typography.body, color: c.textPrimary, flex: 1 },
    hint: { ...typography.caption, color: c.textMuted, marginTop: spacing.sm },
  })
}
