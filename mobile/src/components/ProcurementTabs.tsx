import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { useResponsive } from '../theme/useResponsive'

/**
 * Procurement navigation — the mobile counterpart of the web client's
 * ProcurementTabs. Same thirteen tabs grouped into the same five stages, so
 * the two clients describe the supply chain identically.
 */

export type ProcurementTab =
  | 'dashboard'
  | 'boq'
  | 'rfqs'
  | 'pos'
  | 'grn'
  | 'qc'
  | 'debit'
  | 'inventory'
  | 'requests'
  | 'issues'
  | 'invoices'
  | 'payments'
  | 'vendors'

export interface ProcurementTabMeta {
  key: ProcurementTab
  label: string
  icon: keyof typeof Ionicons.glyphMap
}

export const PROCUREMENT_TABS: ProcurementTabMeta[] = [
  { key: 'dashboard', label: 'Overview', icon: 'speedometer-outline' },
  { key: 'boq', label: 'BOQ control', icon: 'grid-outline' },
  { key: 'rfqs', label: 'RFQs', icon: 'paper-plane-outline' },
  { key: 'pos', label: 'Purchase orders', icon: 'cart-outline' },
  { key: 'grn', label: 'GRN', icon: 'download-outline' },
  { key: 'qc', label: 'QC', icon: 'checkmark-done-outline' },
  { key: 'debit', label: 'Debit notes', icon: 'return-down-back-outline' },
  { key: 'inventory', label: 'Inventory', icon: 'cube-outline' },
  { key: 'requests', label: 'Material requests', icon: 'clipboard-outline' },
  { key: 'issues', label: 'Issues', icon: 'exit-outline' },
  { key: 'invoices', label: 'Invoices', icon: 'receipt-outline' },
  { key: 'payments', label: 'Payments', icon: 'wallet-outline' },
  { key: 'vendors', label: 'Vendors', icon: 'storefront-outline' },
]

export interface ProcurementStage {
  id: string
  step: number | null
  label: string
  title: string
  hint?: string
  tabs: ProcurementTab[]
}

export const PROCUREMENT_STAGES: ProcurementStage[] = [
  { id: 'home', step: null, label: 'Home', title: 'Where things stand', tabs: ['dashboard'] },
  {
    id: 'plan',
    step: 1,
    label: 'Plan',
    title: 'What still needs buying',
    hint: 'After BOQ is approved',
    tabs: ['boq'],
  },
  {
    id: 'buy',
    step: 2,
    label: 'Buy',
    title: 'RFQ → compare → purchase order',
    hint: 'Get prices, then raise PO',
    tabs: ['rfqs', 'pos'],
  },
  {
    id: 'receive',
    step: 3,
    label: 'Receive',
    title: 'GRN → QC → debit if needed',
    hint: 'Goods arrive at site',
    tabs: ['grn', 'qc', 'debit'],
  },
  {
    id: 'store',
    step: 4,
    label: 'Store',
    title: 'Stock & site issues',
    hint: 'Inventory and material out',
    tabs: ['inventory', 'requests', 'issues'],
  },
  {
    id: 'pay',
    step: 5,
    label: 'Pay',
    title: 'Invoice → match → payment',
    hint: 'Settle the vendor',
    tabs: ['invoices', 'payments'],
  },
  {
    id: 'vendors',
    step: null,
    label: 'Vendors',
    title: 'Vendor master',
    hint: 'Directory & ratings',
    tabs: ['vendors'],
  },
]

const TAB_META: Record<ProcurementTab, ProcurementTabMeta> = Object.fromEntries(
  PROCUREMENT_TABS.map((t) => [t.key, t]),
) as Record<ProcurementTab, ProcurementTabMeta>

export function tabMeta(tab: ProcurementTab): ProcurementTabMeta {
  return TAB_META[tab]
}

export function stageForTab(tab: ProcurementTab): ProcurementStage {
  return PROCUREMENT_STAGES.find((s) => s.tabs.includes(tab)) || PROCUREMENT_STAGES[0]
}

/** The next step a buyer normally takes — powers the "Next" shortcut. */
export function nextTabInFlow(tab: ProcurementTab): ProcurementTab | null {
  const order: ProcurementTab[] = [
    'dashboard',
    'boq',
    'rfqs',
    'pos',
    'grn',
    'qc',
    'debit',
    'inventory',
    'requests',
    'issues',
    'invoices',
    'payments',
  ]
  const i = order.indexOf(tab)
  if (i < 0 || i >= order.length - 1) return null
  return order[i + 1]
}

export function ProcurementTabs({
  value,
  onChange,
  counts,
}: {
  value: ProcurementTab
  onChange: (tab: ProcurementTab) => void
  /** Optional badge numbers keyed by tab, e.g. GRNs awaiting QC. */
  counts?: Partial<Record<ProcurementTab, number>>
}) {
  const colors = useColors()
  const { pagePadding } = useResponsive()
  const styles = useMemo(() => createStyles(colors, pagePadding), [colors, pagePadding])

  const stage = stageForTab(value)
  const showTabRow = stage.tabs.length > 1

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stageRow}
      >
        {PROCUREMENT_STAGES.map((s) => {
          const active = s.id === stage.id
          return (
            <Pressable
              key={s.id}
              onPress={() => onChange(s.tabs[0])}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.stage, active && styles.stageActive]}
            >
              {s.step ? (
                <View style={[styles.step, active && styles.stepActive]}>
                  <Text style={[styles.stepText, active && styles.stepTextActive]}>{s.step}</Text>
                </View>
              ) : null}
              <Text style={[styles.stageText, active && styles.stageTextActive]}>{s.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {showTabRow ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {stage.tabs.map((key) => {
            const meta = TAB_META[key]
            const active = key === value
            const count = counts?.[key]
            return (
              <Pressable
                key={key}
                onPress={() => onChange(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Ionicons
                  name={meta.icon}
                  size={13}
                  color={active ? colors.textOnAccent : colors.textSecondary}
                />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{meta.label}</Text>
                {count ? (
                  <View style={[styles.badge, active && styles.badgeActive]}>
                    <Text style={[styles.badgeText, active && styles.badgeTextActive]}>{count}</Text>
                  </View>
                ) : null}
              </Pressable>
            )
          })}
        </ScrollView>
      ) : null}
    </View>
  )
}

function createStyles(c: AppColors, pagePadding: number) {
  return StyleSheet.create({
    wrap: { gap: spacing.sm, marginBottom: spacing.md },
    stageRow: { paddingHorizontal: pagePadding, gap: spacing.xs, alignItems: 'center' },
    stage: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
      borderWidth: 1,
      borderColor: c.border,
    },
    stageActive: { backgroundColor: c.surface, borderColor: c.accent },
    step: {
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.border,
    },
    stepActive: { backgroundColor: c.accent },
    stepText: { ...typography.micro, fontWeight: '700', color: c.textSecondary },
    stepTextActive: { color: c.textOnAccent },
    stageText: { ...typography.caption, fontWeight: '600', color: c.textSecondary },
    stageTextActive: { color: c.textPrimary },
    tabRow: { paddingHorizontal: pagePadding, gap: spacing.xs },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
    },
    tabActive: { backgroundColor: c.accent },
    tabText: { ...typography.micro, fontWeight: '600', color: c.textSecondary },
    tabTextActive: { color: c.textOnAccent },
    badge: {
      minWidth: 16,
      paddingHorizontal: 4,
      borderRadius: 8,
      backgroundColor: c.border,
      alignItems: 'center',
    },
    badgeActive: { backgroundColor: 'rgba(255,255,255,0.28)' },
    badgeText: { ...typography.micro, fontWeight: '700', color: c.textSecondary },
    badgeTextActive: { color: c.textOnAccent },
  })
}
