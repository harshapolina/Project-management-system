import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../../navigation/types'
import type { ProcurementTab } from '../../../components/ProcurementTabs'

export type ProcurementNav = NativeStackNavigationProp<MoreStackParamList>

export interface TabProps {
  /** Empty string means "all projects". */
  projectId: string
  projectName?: string
  navigation: ProcurementNav
  onChangeTab: (tab: ProcurementTab) => void
  onPickProject: () => void
}
