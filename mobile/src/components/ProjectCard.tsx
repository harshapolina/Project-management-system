import { useMemo } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { radius, spacing, stageLabel, typography, type AppColors } from '../constants/theme'
import { useColors, useShadows } from '../theme/useColors'
import { Pill } from './Badge'
import { Avatar } from './Avatar'
import { assetUrl } from '../constants/env'
import type { Project } from '../types/models'

const STATUS_LABEL: Record<string, string> = {
  in_progress: 'Active',
  completed: 'Done',
  on_hold: 'On hold',
  delayed: 'Delayed',
}

export function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const colors = useColors()
  const shadows = useShadows()
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows])
  const statusKey = project.isDelayed ? 'delayed' : project.status
  const statusColor = colors.status[statusKey] || colors.textMuted
  const memberCount = project.members?.length || 0
  const progress = Math.min(100, Math.round(project.progress || 0))
  const cover = assetUrl(project.coverImage)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
      accessibilityRole="button"
    >
      {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : <View style={styles.coverFallback} />}
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {project.name}
          </Text>
          <Pill label={STATUS_LABEL[statusKey] || statusKey} color={statusColor} bg={`${statusColor}18`} />
        </View>
        <Text style={styles.client} numberOfLines={1}>
          {project.clientName}
          {project.location ? `  ·  ${project.location}` : ''}
        </Text>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{progress}%</Text>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.avatarStack}>
            {(project.members || []).slice(0, 3).map((m, i) => (
              <View key={m.user._id} style={[styles.avatarWrap, { marginLeft: i === 0 ? 0 : -8 }]}>
                <Avatar name={m.user.name} uri={m.user.avatar} size={22} />
              </View>
            ))}
            {memberCount > 3 ? <Text style={styles.moreMembers}>+{memberCount - 3}</Text> : null}
          </View>
          <Text style={styles.stage} numberOfLines={1}>
            {stageLabel(project.currentStage) || project.currentStage}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

function createStyles(c: AppColors, shadows: ReturnType<typeof useShadows>) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      width: '100%',
      ...shadows.card,
    },
    cover: { width: '100%', height: 92, backgroundColor: c.surfaceRaised },
    coverFallback: { width: '100%', height: 8, backgroundColor: c.accentSoft },
    body: { padding: spacing.md, gap: 6 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    name: { ...typography.h3, color: c.textPrimary, flexShrink: 1, fontSize: 17 },
    client: { ...typography.caption, color: c.textSecondary },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    progressTrack: {
      flex: 1,
      height: 5,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: c.accent, borderRadius: radius.full },
    progressLabel: { ...typography.micro, color: c.textMuted, width: 32, textAlign: 'right' },
    footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
    avatarStack: { flexDirection: 'row', alignItems: 'center' },
    avatarWrap: { borderWidth: 2, borderColor: c.surface, borderRadius: 999 },
    moreMembers: { ...typography.micro, color: c.textMuted, marginLeft: 6 },
    stage: { ...typography.micro, color: c.textMuted },
  })
}
