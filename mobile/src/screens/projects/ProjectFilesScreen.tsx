import { NestedChrome } from '../../components/NestedChrome'
import { useMemo, useState } from 'react'
import { Alert, FlatList, Linking, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { SectionLabel } from '../../components/SectionLabel'
import { SegmentedControl } from '../../components/SegmentedControl'
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

/** Same five buckets the web client files into — keep the keys in step. */
const FOLDERS = [
  { key: 'concepts', label: 'Concepts' },
  { key: 'drawings', label: 'Drawings' },
  { key: 'renders', label: '3D Renders' },
  { key: 'approvals', label: 'Approvals' },
  { key: 'site_photos', label: 'Site photos' },
] as const

type FolderKey = (typeof FOLDERS)[number]['key']

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

  const [folder, setFolder] = useState<FolderKey>('concepts')

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['files', projectId, folder],
    queryFn: () => filesApi.list(projectId, folder),
    enabled: caps.manageFiles,
  })

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      })
      if (result.canceled || !result.assets?.length) return { ok: 0, failed: 0 }

      // Uploaded one at a time: the server writes a version per file, and a
      // site connection is far likelier to finish five small requests than
      // one large parallel burst.
      let ok = 0
      let failed = 0
      for (const asset of result.assets) {
        try {
          await filesApi.upload(
            projectId,
            { uri: asset.uri, name: asset.name, mimeType: asset.mimeType },
            folder,
          )
          ok += 1
        } catch {
          failed += 1
        }
      }
      return { ok, failed }
    },
    onSuccess: (res) => {
      if (res.ok) queryClient.invalidateQueries({ queryKey: ['files', projectId] })
      if (res.failed) {
        Alert.alert(
          'Some files did not upload',
          `${res.ok} uploaded, ${res.failed} failed. Check your connection and try the rest again.`,
        )
      }
    },
    onError: (err) => {
      Alert.alert('Upload failed', isApiError(err) ? err.message : 'Could not upload those files.')
    },
  })

  const chromeProps = {
    title: "Files",
    subtitle: projectName || 'Project files',
    subtitleIcon: 'folder-outline' as const,
  }

  if (!caps.manageFiles) {
    return (
      <NestedChrome {...chromeProps}>
      <EmptyState title="Files aren't available" body="Your role doesn't have access to project files." />
      </NestedChrome>
    )
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
      <LoadingState label="Loading files…" variant="list" />
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

  const files = data || []
  const folderOptions = FOLDERS.map((f) => ({ key: f.key, label: f.label }))
  const folderLabel = FOLDERS.find((f) => f.key === folder)?.label || 'Files'

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
    <NestedChrome {...chromeProps}>
      <SegmentedControl options={folderOptions} value={folder} onChange={setFolder} />

      <FlatList
        data={files}
        keyExtractor={(f) => f._id}
        contentContainerStyle={listContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
        ListHeaderComponent={
          files.length > 0 ? <SectionLabel count={files.length}>{folderLabel}</SectionLabel> : null
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            icon="folder-open-outline"
            title={`Nothing in ${folderLabel}`}
            body="Upload drawings, BOQs, and documents — each keeps its own version history."
            action="Upload files"
            onAction={() => uploadMutation.mutate()}
          />
        }
      />

      <Fab
        label="Upload files"
        icon={uploadMutation.isPending ? 'hourglass-outline' : 'cloud-upload-outline'}
        onPress={() => uploadMutation.mutate()}
        disabled={uploadMutation.isPending}
        aboveTabBar={true}
      />
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    name: { ...typography.bodyStrong, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textSecondary, textTransform: 'capitalize' },
  })
}
