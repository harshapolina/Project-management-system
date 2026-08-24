import { useMemo } from 'react'
import { FlatList, Linking, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { Screen } from '../../components/Screen'
import { PageHeader } from '../../components/PageHeader'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { Fab } from '../../components/Fab'
import { Pill } from '../../components/Badge'
import { EmptyState, ErrorState, LoadingState } from '../../components/States'
import { IconWell } from '../../components/IconWell'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { filesApi } from '../../api/files'
import { assetUrl } from '../../constants/env'
import { isApiError } from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { capabilitiesForUser } from '../../utils/roles'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProjectStackParamList } from '../../navigation/types'
import type { ProjectFile } from '../../types/models'

type Props = NativeStackScreenProps<ProjectStackParamList, 'ProjectFiles'>

function statusColorMap(c: AppColors): Record<string, string> {
  return {
    draft: c.textMuted,
    sent: c.accent,
    approved: c.success,
  }
}

function iconForMime(mime?: string): keyof typeof Ionicons.glyphMap {
  if (!mime) return 'document-outline'
  if (mime.startsWith('image/')) return 'image-outline'
  if (mime === 'application/pdf') return 'document-text-outline'
  return 'document-outline'
}

export function ProjectFilesScreen({ route, navigation }: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])

  const { projectId, projectName } = route.params
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

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

  const pageHeader = (
    <PageHeader
      title="Files"
      subtitle={projectName || 'Project files'}
      subtitleIcon="folder-outline"
      onBack={() => navigation.goBack()}
    />
  )

  if (!caps.manageFiles) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']}>
        {pageHeader}
        <EmptyState title="Files aren't available" body="Your role doesn't have access to project files." />
      </Screen>
    )
  }

  if (isLoading) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']}>
        {pageHeader}
        <LoadingState label="Loading files…" variant="list" />
      </Screen>
    )
  }
  if (isError) {
    return (
      <Screen padded={false} edges={['top', 'left', 'right']}>
        {pageHeader}
        <ErrorState message={isApiError(error) ? error.message : undefined} onRetry={() => refetch()} />
      </Screen>
    )
  }

  const files = data || []

  const renderItem = ({ item }: { item: ProjectFile }) => {
    const current = item.versions[item.versions.length - 1]
    return (
      <SurfaceCard onPress={() => current?.url && Linking.openURL(assetUrl(current.url))}>
        <View style={styles.row}>
          <IconWell name={iconForMime(item.mime)} tone="accent" size={18} well={36} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              v{item.currentVersion} · {item.folder}
            </Text>
          </View>
          <Pill
            label={item.status}
            color={statusColorMap(colors)[item.status] || colors.textMuted}
            bg={`${statusColorMap(colors)[item.status] || colors.textMuted}22`}
          />
        </View>
      </SurfaceCard>
    )
  }

  return (
    <Screen padded={false} edges={['top', 'left', 'right']}>
      {pageHeader}
      <FlatList
        data={files}
        keyExtractor={(f) => f._id}
        contentContainerStyle={listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
        ListHeaderComponent={files.length > 0 ? <SectionLabel count={files.length}>Files</SectionLabel> : null}
        renderItem={renderItem}
        ListEmptyComponent={<EmptyState title="No files yet" body="Drawings, BOQs, and documents will show up here." />}
      />

      <Fab
        label="Upload file"
        icon={uploadMutation.isPending ? 'hourglass-outline' : 'cloud-upload-outline'}
        onPress={() => uploadMutation.mutate()}
        disabled={uploadMutation.isPending}
        aboveTabBar={true}
      />
    </Screen>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    name: { ...typography.bodyStrong, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textSecondary, textTransform: 'capitalize' },
  })
}
