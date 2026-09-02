import { NestedChrome } from '../../components/NestedChrome'
import { useMemo, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Pill } from '../../components/Badge'
import { Input } from '../../components/Input'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { platformApi } from '../../api/platform'
import { isApiError } from '../../api/client'
import { ROLE_LABELS } from '../../utils/roles'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { PlatformStackParamList } from '../../navigation/types'
import type { Role } from '../../types/models'

type Props = NativeStackScreenProps<PlatformStackParamList, 'PlatformUsers'>

export function PlatformUsersScreen({ navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['platform-all-users', search.trim() || undefined],
    queryFn: () => platformApi.users(search.trim() || undefined),
  })

  const chromeProps = {
    title: "All users",
    subtitle: "Across every company",
    subtitleIcon: 'people-outline' as const,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading users…" variant="list" />
      </NestedChrome>
    )
  }
  if (isError) {
    return (
      <NestedChrome {...chromeProps}>
      <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </NestedChrome>
    )
  }

  const users = data || []

  return (
    <NestedChrome {...chromeProps}>
      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={listContent}
        ListHeaderComponent={
          <>
            <Input
              label="Search"
              placeholder="Name, email, or company…"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
            {users.length > 0 ? <SectionLabel count={users.length}>Users</SectionLabel> : null}
          </>
        }
        renderItem={({ item }) => (
          <SurfaceCard>
            <View style={styles.cardTop}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Pill
                label={item.isActive !== false ? 'Active' : 'Inactive'}
                color={item.isActive !== false ? colors.success : colors.danger}
                bg={item.isActive !== false ? colors.successSoft : colors.dangerSoft}
              />
            </View>
            <Text style={styles.meta}>{item.email}</Text>
            <Text style={styles.meta}>
              {item.companyName || '—'}
              {item.workspace ? ` · ${item.workspace}` : ''}
            </Text>
            <Text style={styles.role}>{ROLE_LABELS[item.role as Role] || item.role}</Text>
          </SurfaceCard>
        )}
        ListEmptyComponent={<EmptyState title="No users found" body="Try a different search term." />}
      />
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    name: { ...typography.bodyStrong, color: c.textPrimary, flexShrink: 1 },
    meta: { ...typography.caption, color: c.textSecondary, marginTop: 2 },
    role: { ...typography.captionStrong, color: c.textMuted, marginTop: 4 },
  })
}
