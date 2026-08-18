import { useLayoutEffect } from 'react'
import { FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { Screen } from '../../components/Screen'
import { Pill } from '../../components/Badge'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { colors, radius, spacing, typography } from '../../constants/theme'
import { filesApi } from '../../api/files'
import { assetUrl } from '../../constants/env'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser } from '../../utils/roles'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProjectStackParamList } from '../../navigation/types'
import type { ProjectFile } from '../../types/models'

type Props = NativeStackScreenProps<ProjectStackParamList, 'ProjectFiles'>

const STATUS_COLOR: Record<string, string> = {
  draft: colors.textMuted,
  sent: colors.accent,
  approved: colors.success,
}

function iconForMime(mime?: string) {
  if (!mime) return 'document-outline'
  if (mime.startsWith('image/')) return 'image-outline'
  if (mime === 'application/pdf') return 'document-text-outline'
  return 'document-outline'
}

export function ProjectFilesScreen({ route, navigation }: Props) {
  const { projectId, projectName } = route.params
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

  useLayoutEffect(() => {
    navigation.setOptions({ title: projectName ? `${projectName} · Files` : 'Files' })
  }, [navigation, projectName])

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['files', projectId],
    queryFn: () => filesApi.list(projectId),
    enabled: caps.manageFiles,
  })

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const result = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true })
      if (result.canceled || !result.assets?.[0]) return null
      const asset = result.assets[0]
      return filesApi.upload(projectId, { uri: asset.uri, name: asset.name, mimeType: asset.mimeType })
    },
    onSuccess: (file) => {
      if (file) queryClient.invalidateQueries({ queryKey: ['files', projectId] })
    },
  })

  if (!caps.manageFiles) {
    return (
      <Screen>
        <EmptyState title="Files aren't available" body="Your role doesn't have access to project files." />
      </Screen>
    )
  }

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading files…" />
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

  const renderItem = ({ item }: { item: ProjectFile }) => {
    const current = item.versions[item.versions.length - 1]
    return (
      <Pressable
        style={styles.row}
        onPress={() => current?.url && Linking.openURL(assetUrl(current.url))}
        accessibilityRole="button"
      >
        <View style={styles.iconWrap}>
          <Ionicons name={iconForMime(item.mime) as any} size={20} color={colors.accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            v{item.currentVersion} · {item.folder}
          </Text>
        </View>
        <Pill label={item.status} color={STATUS_COLOR[item.status] || colors.textMuted} bg={`${STATUS_COLOR[item.status] || colors.textMuted}22`} />
      </Pressable>
    )
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={data}
        keyExtractor={(f) => f._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
        renderItem={renderItem}
        ListEmptyComponent={<EmptyState title="No files yet" body="Drawings, BOQs, and documents will show up here." />}
      />

      <Pressable
        style={styles.fab}
        onPress={() => uploadMutation.mutate()}
        disabled={uploadMutation.isPending}
        accessibilityRole="button"
        accessibilityLabel="Upload file"
      >
        <Ionicons name={uploadMutation.isPending ? 'hourglass-outline' : 'cloud-upload-outline'} size={24} color="#fff" />
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl * 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.bodyStrong, color: colors.textPrimary },
  meta: { ...typography.caption, color: colors.textSecondary, textTransform: 'capitalize' },
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
