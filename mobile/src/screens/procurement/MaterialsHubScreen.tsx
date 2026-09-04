import { useCallback, useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { NestedChrome } from '../../components/NestedChrome'
import { IconButton } from '../../components/IconButton'
import { SearchField } from '../../components/SearchField'
import { ProcurementTabs, stageForTab, type ProcurementTab } from '../../components/ProcurementTabs'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { projectsApi } from '../../api/projects'
import { procurementFlowApi } from '../../api/procurementFlow'
import { OverviewTab } from './tabs/OverviewTab'
import { BoqControlTab } from './tabs/BoqControlTab'
import { RfqsTab } from './tabs/RfqsTab'
import { PurchaseOrdersTab } from './tabs/PurchaseOrdersTab'
import { GrnTab } from './tabs/GrnTab'
import { QcTab } from './tabs/QcTab'
import { DebitNotesTab } from './tabs/DebitNotesTab'
import { MaterialRequestsTab } from './tabs/MaterialRequestsTab'
import { MaterialIssuesTab } from './tabs/MaterialIssuesTab'
import { PaymentsTab } from './tabs/PaymentsTab'
import type { TabProps } from './tabs/types'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'MaterialsHub'>

export function MaterialsHubScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [tab, setTab] = useState<ProcurementTab>(route.params?.tab ?? 'dashboard')
  const [projectId, setProjectId] = useState(route.params?.projectId ?? '')
  const [projectName, setProjectName] = useState(route.params?.projectName ?? '')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')

  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
    enabled: pickerOpen,
  })

  // Badge the tabs that have work waiting, the way the web overview does.
  const dashboard = useQuery({
    queryKey: ['procurement-dashboard'],
    queryFn: procurementFlowApi.dashboard,
  })

  const changeTab = useCallback(
    (next: ProcurementTab) => {
      if (next === 'vendors') {
        navigation.navigate('Vendors')
        return
      }
      if (next === 'inventory') {
        navigation.navigate('Inventory')
        return
      }
      if (next === 'invoices') {
        navigation.navigate('Billing')
        return
      }
      setTab(next)
    },
    [navigation],
  )

  const tabProps: TabProps = {
    projectId,
    projectName,
    navigation,
    onChangeTab: changeTab,
    onPickProject: () => setPickerOpen(true),
  }

  const pending = dashboard.data?.pending
  const counts: Partial<Record<ProcurementTab, number>> = {
    rfqs: pending?.rfqs,
    pos: pending?.draftPos,
    qc: pending?.grnQc,
    debit: pending?.debitNotes,
    requests: pending?.materialRequests,
    payments: pending?.payments,
    invoices: pending?.unpaidInvoices,
  }

  const stage = stageForTab(tab)

  const filtered = (projects.data || []).filter((p) => {
    const q = projectSearch.trim().toLowerCase()
    if (!q) return true
    return [p.name, p.clientName].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
  })

  return (
    <NestedChrome
      title="Materials"
      subtitle={projectName || 'All projects'}
      subtitleIcon="layers-outline"
      right={
        <IconButton
          icon="folder-outline"
          label="Filter by project"
          tone={projectId ? 'accent' : 'ghost'}
          onPress={() => setPickerOpen(true)}
        />
      }
    >
      <ProcurementTabs value={tab} onChange={changeTab} counts={counts} />

      <View style={[listContent, styles.stageStrip]}>
        <Text style={styles.stageTitle}>{stage.title}</Text>
        {stage.hint ? <Text style={styles.stageHint}>{stage.hint}</Text> : null}
      </View>

      {tab === 'dashboard' ? <OverviewTab {...tabProps} /> : null}
      {tab === 'boq' ? <BoqControlTab {...tabProps} /> : null}
      {tab === 'rfqs' ? <RfqsTab {...tabProps} /> : null}
      {tab === 'pos' ? <PurchaseOrdersTab {...tabProps} /> : null}
      {tab === 'grn' ? <GrnTab {...tabProps} /> : null}
      {tab === 'qc' ? <QcTab {...tabProps} /> : null}
      {tab === 'debit' ? <DebitNotesTab {...tabProps} /> : null}
      {tab === 'requests' ? <MaterialRequestsTab {...tabProps} /> : null}
      {tab === 'issues' ? <MaterialIssuesTab {...tabProps} /> : null}
      {tab === 'payments' ? <PaymentsTab {...tabProps} /> : null}

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Scope to a project</Text>
            <SearchField
              value={projectSearch}
              onChangeText={setProjectSearch}
              placeholder="Search projects"
              inset={false}
            />
            <Pressable
              style={styles.sheetRow}
              onPress={() => {
                setProjectId('')
                setProjectName('')
                setPickerOpen(false)
              }}
            >
              <Ionicons name="albums-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.sheetRowText}>All projects</Text>
              {!projectId ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : null}
            </Pressable>
            <FlatList
              data={filtered}
              keyExtractor={(p) => p._id}
              style={styles.sheetList}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.sheetRow}
                  onPress={() => {
                    setProjectId(item._id)
                    setProjectName(item.name)
                    setPickerOpen(false)
                  }}
                >
                  <Ionicons name="folder-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.sheetRowText} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {projectId === item._id ? (
                    <Ionicons name="checkmark" size={18} color={colors.accent} />
                  ) : null}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.sheetEmpty}>No projects match.</Text>}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    stageStrip: { paddingBottom: spacing.sm, gap: 2 },
    stageTitle: { ...typography.captionStrong, color: c.textPrimary },
    stageHint: { ...typography.micro, color: c.textMuted },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.sm,
      maxHeight: '75%',
    },
    sheetTitle: { ...typography.h3, color: c.textPrimary },
    sheetList: { maxHeight: 340 },
    sheetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    sheetRowText: { ...typography.body, color: c.textPrimary, flex: 1 },
    sheetEmpty: { ...typography.caption, color: c.textSecondary, paddingVertical: spacing.md },
  })
}
