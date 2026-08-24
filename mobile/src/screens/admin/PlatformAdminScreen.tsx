import { useMemo } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Screen } from '../../components/Screen'
import { AppNavBar } from '../../components/AppNavBar'
import { PageHeader } from '../../components/PageHeader'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Pill } from '../../components/Badge'
import { IconButton } from '../../components/IconButton'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { platformApi } from '../../api/platform'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'PlatformAdmin'>

function statusColor(c: AppColors) {
  return { trial: c.warning, active: c.success, suspended: c.danger }
}

export function PlatformAdminScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['platform-tenants'],
    queryFn: platformApi.tenants,
  })

  const pageHeader = (
    <>
      <AppNavBar />
    <PageHeader
      title="Workspaces"
      subtitle="Companies on Cubic"
      subtitleIcon="server-outline"
      onBack={() => navigation.goBack()}
      right={
        <IconButton
          icon="add-outline"
          label="New workspace"
          tone="ghost"
          onPress={() => navigation.navigate('CreateTenant')}
        />
      }
    />
    </>
  )

  if (isLoading) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        {pageHeader}
        <LoadingState label="Loading workspaces…" variant="list" />
      </Screen>
    )
  }
  if (isError) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        {pageHeader}
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  const tenants = data || []

  return (
    <Screen padded={false} edges={['left', 'right']}>
      {pageHeader}
      <FlatList
        data={tenants}
        keyExtractor={(t) => t._id}
        contentContainerStyle={listContent}
        ListHeaderComponent={
          tenants.length > 0 ? <SectionLabel count={tenants.length}>Workspaces</SectionLabel> : null
        }
        renderItem={({ item }) => (
          <SurfaceCard>
            <View style={styles.cardTop}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Pill label={item.status} color={statusColor(colors)[item.status]} bg={`${statusColor(colors)[item.status]}22`} />
            </View>
            <Text style={styles.meta}>
              {item.slug} · {item.seatsUsed}/{item.seatLimit} seats
            </Text>
          </SurfaceCard>
        )}
        ListEmptyComponent={<EmptyState title="No workspaces yet" body="Create the first tenant to onboard a company." />}
      />
    </Screen>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    name: { ...typography.bodyStrong, color: c.textPrimary, flexShrink: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 4 },
  })
}
