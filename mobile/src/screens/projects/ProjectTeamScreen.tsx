import { useMemo, useState } from 'react'
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CompositeNavigationProp } from '@react-navigation/native'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { Screen } from '../../components/Screen'
import { AppNavBar } from '../../components/AppNavBar'
import { PageHeader } from '../../components/PageHeader'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Avatar } from '../../components/Avatar'
import { Fab } from '../../components/Fab'
import { IconButton } from '../../components/IconButton'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { projectsApi } from '../../api/projects'
import { adminApi } from '../../api/admin'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { ROLE_LABELS, capabilitiesForUser } from '../../utils/roles'
import type { Role } from '../../types/models'
import type { ProjectStackParamList, RootTabParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProjectStackParamList, 'ProjectTeam'>
type Nav = CompositeNavigationProp<
  Props['navigation'],
  BottomTabNavigationProp<RootTabParamList>
>

export function ProjectTeamScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { projectId, projectName } = route.params
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)
  const queryClient = useQueryClient()
  const [pickerOpen, setPickerOpen] = useState(false)
  const tabNav = navigation as unknown as Nav

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
  })

  const users = useQuery({
    queryKey: ['users'],
    queryFn: adminApi.users,
    enabled: pickerOpen && caps.manageProjects,
  })

  const addMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.addMember(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      setPickerOpen(false)
    },
    onError: (err) => Alert.alert('Could not add member', isApiError(err) ? err.message : 'Try again'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(projectId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
    onError: (err) => Alert.alert('Could not remove member', isApiError(err) ? err.message : 'Try again'),
  })

  const openAdd = () => setPickerOpen(true)

  const openConversation = (userId: string, userName: string) => {
    tabNav.navigate('Inbox', {
      screen: 'Conversation',
      params: { userId, userName },
    })
  }

  const confirmRemove = (userId: string, name: string) => {
    Alert.alert('Remove member', `Remove ${name} from this project?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeMutation.mutate(userId),
      },
    ])
  }

  const header = (
    <>
      <AppNavBar />
      <PageHeader
        title="Team"
        subtitle={projectName || 'Project team'}
        subtitleIcon="people-outline"
        onBack={() => navigation.goBack()}
        right={
          caps.manageProjects ? (
            <IconButton icon="person-add-outline" label="Add member" tone="ghost" onPress={openAdd} />
          ) : null
        }
      />
    </>
  )

  if (isLoading) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        {header}
        <LoadingState label="Loading team…" variant="rows" />
      </Screen>
    )
  }
  if (isError || !data) {
    return (
      <Screen padded={false} edges={['left', 'right']}>
        {header}
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  const members = data.project.members || []
  const memberIds = new Set(members.map((m) => m.user._id))
  const candidates = (users.data || []).filter((u) => !memberIds.has(u._id))

  return (
    <Screen padded={false} edges={['left', 'right']}>
      {header}
      <FlatList
        data={members}
        keyExtractor={(m) => m.user._id}
        contentContainerStyle={listContent}
        ListHeaderComponent={members.length > 0 ? <SectionLabel count={members.length}>Members</SectionLabel> : null}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openConversation(item.user._id, item.user.name)}
            onLongPress={
              caps.manageProjects ? () => confirmRemove(item.user._id, item.user.name) : undefined
            }
          >
            <SurfaceCard>
              <View style={styles.row}>
                <Avatar name={item.user.name} uri={item.user.avatar} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.user.name}
                  </Text>
                  <Text style={styles.role} numberOfLines={1}>
                    {ROLE_LABELS[(item.role || item.user.role) as Role] || item.role || item.user.role}
                  </Text>
                  {item.user.email ? (
                    <Text style={styles.email} numberOfLines={1}>
                      {item.user.email}
                    </Text>
                  ) : null}
                </View>
                {caps.manageProjects ? (
                  <Pressable
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.user.name}`}
                    onPress={() => confirmRemove(item.user._id, item.user.name)}
                    style={styles.trashBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                ) : (
                  <Ionicons name="chatbubble-outline" size={18} color={colors.textMuted} />
                )}
              </View>
            </SurfaceCard>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No team members yet"
            body="Add people who work on this project."
            action={caps.manageProjects ? 'Add member' : undefined}
            onAction={caps.manageProjects ? openAdd : undefined}
          />
        }
      />

      {caps.manageProjects ? <Fab label="Add member" icon="person-add-outline" onPress={openAdd} aboveTabBar={false} /> : null}

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Add member</Text>
            {users.isLoading ? (
              <Text style={styles.modalEmpty}>Loading people…</Text>
            ) : candidates.length === 0 ? (
              <Text style={styles.modalEmpty}>Everyone is already on this project.</Text>
            ) : (
              <FlatList
                data={candidates}
                keyExtractor={(u) => u._id}
                style={styles.modalList}
                renderItem={({ item: u }) => (
                  <Pressable
                    style={styles.modalRow}
                    disabled={addMutation.isPending}
                    onPress={() => addMutation.mutate(u._id)}
                  >
                    <Avatar name={u.name} uri={u.avatar} size={36} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.modalRowText} numberOfLines={1}>
                        {u.name}
                      </Text>
                      <Text style={styles.modalRowMeta} numberOfLines={1}>
                        {ROLE_LABELS[u.role] || u.role}
                        {u.email ? ` · ${u.email}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
                  </Pressable>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    name: { ...typography.bodyStrong, color: c.textPrimary },
    role: { ...typography.caption, color: c.textSecondary },
    email: { ...typography.micro, color: c.textMuted },
    trashBtn: {
      padding: 6,
      borderRadius: radius.full,
      backgroundColor: c.dangerSoft,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: 4,
      maxHeight: '70%',
    },
    modalTitle: { ...typography.h3, color: c.textPrimary, marginBottom: spacing.sm },
    modalList: { maxHeight: 360 },
    modalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    modalRowText: { ...typography.bodyStrong, color: c.textPrimary },
    modalRowMeta: { ...typography.caption, color: c.textSecondary, marginTop: 2 },
    modalEmpty: { ...typography.body, color: c.textSecondary, paddingVertical: spacing.md },
  })
}
