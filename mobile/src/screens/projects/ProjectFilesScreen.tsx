import { NestedChrome } from '../../components/NestedChrome'
import { useMemo, useState } from 'react'
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native'
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
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
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
    rejected: c.danger,
  }
}

/** Sign-off state reads differently from the folder status — show both. */
function approvalLabel(file: ProjectFile): string | null {
  switch (file.approvalStatus) {
    case 'pending':
      return 'Awaiting sign-off'
    case 'approved':
      return 'Signed off'
    case 'rejected':
      return 'Changes requested'
    default:
      return null
  }
}

function approvalColor(c: AppColors, file: ProjectFile): string {
  const map: Record<string, string> = {
    pending: c.warning,
    approved: c.success,
    rejected: c.danger,
  }
  return map[file.approvalStatus || 'none'] || c.textMuted
}

function personName(ref: ProjectFile['approver']): string {
  return ref && typeof ref === 'object' ? ref.name : ''
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
  const [renaming, setRenaming] = useState<ProjectFile | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [approving, setApproving] = useState<ProjectFile | null>(null)
  const [approvalNote, setApprovalNote] = useState('')

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

  const invalidateFiles = () => {
    queryClient.invalidateQueries({ queryKey: ['files', projectId] })
  }

  const patchFile = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Parameters<typeof filesApi.update>[1]
    }) => filesApi.update(id, payload),
    onSuccess: () => {
      invalidateFiles()
      setRenaming(null)
    },
    onError: (err) => Alert.alert('Could not update', isApiError(err) ? err.message : 'Try again'),
  })

  const removeFile = useMutation({
    mutationFn: (id: string) => filesApi.remove(id),
    onSuccess: invalidateFiles,
    onError: (err) => Alert.alert('Could not delete', isApiError(err) ? err.message : 'Try again'),
  })

  const requestApproval = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      filesApi.requestApproval(id, note ? { note } : {}),
    onSuccess: () => {
      invalidateFiles()
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      setApproving(null)
      setApprovalNote('')
      Alert.alert('Sent for approval', 'The approver gets a notification straight away.')
    },
    onError: (err) => {
      setApproving(null)
      Alert.alert('Could not send', isApiError(err) ? err.message : 'Try again')
    },
  })

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approved' | 'rejected' }) =>
      filesApi.decide(id, { decision }),
    onSuccess: () => {
      invalidateFiles()
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
    onError: (err) => Alert.alert('Could not decide', isApiError(err) ? err.message : 'Try again'),
  })

  const openFileActions = (file: ProjectFile) => {
    const isMine = personName(file.approver) && file.approver && typeof file.approver === 'object'
      ? file.approver._id === user?.id
      : false
    const canDecide = file.approvalStatus === 'pending' && (isMine || caps.companyAdmin)

    const actions: { label: string; destructive?: boolean; run: () => void }[] = [
      {
        label: 'Rename',
        run: () => {
          setRenameValue(file.name)
          setRenaming(file)
        },
      },
      {
        label: file.clientVisible ? 'Hide from client' : 'Share with client',
        run: () => patchFile.mutate({ id: file._id, payload: { clientVisible: !file.clientVisible } }),
      },
      ...FOLDERS.filter((f) => f.key !== file.folder).map((f) => ({
        label: `Move to ${f.label}`,
        run: () => patchFile.mutate({ id: file._id, payload: { folder: f.key } }),
      })),
      ...(file.approvalStatus !== 'pending'
        ? [
            {
              label: 'Send for approval',
              run: () => {
                setApprovalNote('')
                setApproving(file)
              },
            },
          ]
        : []),
      ...(canDecide
        ? [
            {
              label: 'Approve',
              run: () => decide.mutate({ id: file._id, decision: 'approved' }),
            },
            {
              label: 'Request changes',
              run: () => decide.mutate({ id: file._id, decision: 'rejected' }),
            },
          ]
        : []),
      {
        label: 'Delete file',
        destructive: true,
        run: () =>
          Alert.alert('Delete file', `Delete ${file.name} and all its versions?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => removeFile.mutate(file._id) },
          ]),
      },
    ]

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: file.name,
          options: [...actions.map((a) => a.label), 'Cancel'],
          cancelButtonIndex: actions.length,
          destructiveButtonIndex: actions.findIndex((a) => a.destructive),
        },
        (i) => actions[i]?.run(),
      )
      return
    }
    Alert.alert(file.name, undefined, [
      ...actions.map((a) => ({
        text: a.label,
        style: a.destructive ? ('destructive' as const) : undefined,
        onPress: a.run,
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ])
  }

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
    const statusColor = statusColorMap(colors)[item.status] || colors.textMuted
    const signOff = approvalLabel(item)
    return (
      <SurfaceCard
        onPress={() => {
          if (current?.url) Linking.openURL(assetUrl(current.url))
        }}
      >
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
          <Pill label={item.status} color={statusColor} bg={`${statusColor}22`} />
          <Pressable
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Actions for ${item.name}`}
            onPress={() => openFileActions(item)}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        {signOff || item.clientVisible ? (
          <View style={styles.flags}>
            {signOff ? (
              <Pill
                label={signOff}
                color={approvalColor(colors, item)}
                bg={`${approvalColor(colors, item)}18`}
              />
            ) : null}
            {item.clientVisible ? (
              <Pill label="Client can see" color={colors.accentHover} bg={colors.accentSoft} />
            ) : null}
          </View>
        ) : null}

        {item.approvalStatus === 'pending' && personName(item.approver) ? (
          <Text style={styles.approvalMeta} numberOfLines={1}>
            With {personName(item.approver)}
            {item.approvalNote ? ` · ${item.approvalNote}` : ''}
          </Text>
        ) : null}
        {item.approvalStatus === 'rejected' && item.decisionNote ? (
          <Text style={[styles.approvalMeta, { color: colors.danger }]} numberOfLines={2}>
            {item.decisionNote}
          </Text>
        ) : null}
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

      <Modal
        visible={!!renaming}
        transparent
        animationType="fade"
        onRequestClose={() => setRenaming(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setRenaming(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Rename file</Text>
            <Input label="File name" value={renameValue} onChangeText={setRenameValue} autoFocus />
            <View style={styles.visibleRow}>
              <Text style={styles.visibleLabel}>Visible to the client</Text>
              <Switch
                value={!!renaming?.clientVisible}
                onValueChange={(v) => {
                  if (renaming) patchFile.mutate({ id: renaming._id, payload: { clientVisible: v } })
                }}
                trackColor={{ true: colors.accent }}
              />
            </View>
            <Button
              title="Save"
              disabled={!renameValue.trim()}
              loading={patchFile.isPending}
              onPress={() => {
                if (renaming) patchFile.mutate({ id: renaming._id, payload: { name: renameValue.trim() } })
              }}
              fullWidth
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!approving}
        transparent
        animationType="fade"
        onRequestClose={() => setApproving(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setApproving(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Send for approval</Text>
            <Text style={styles.sheetHint}>
              {approving?.name} goes to whoever your workspace routes drawings to. Add a note if it
              needs context.
            </Text>
            <Input
              label="Note (optional)"
              value={approvalNote}
              onChangeText={setApprovalNote}
              multiline
            />
            <Button
              title="Send for approval"
              loading={requestApproval.isPending}
              onPress={() => {
                if (approving) requestApproval.mutate({ id: approving._id, note: approvalNote.trim() })
              }}
              fullWidth
            />
          </Pressable>
        </Pressable>
      </Modal>
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    name: { ...typography.bodyStrong, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textSecondary, textTransform: 'capitalize' },
    flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
    approvalMeta: { ...typography.micro, color: c.textMuted, marginTop: 6 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.sm,
    },
    sheetTitle: { ...typography.h3, color: c.textPrimary },
    sheetHint: { ...typography.caption, color: c.textSecondary },
    visibleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
    },
    visibleLabel: { ...typography.body, color: c.textPrimary },
  })
}
