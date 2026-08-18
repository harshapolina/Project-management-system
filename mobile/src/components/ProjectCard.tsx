import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, shadows, spacing, stageLabel, typography } from '../constants/theme'
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    width: '100%',
    ...shadows.card,
  },
  cover: { width: '100%', height: 92, backgroundColor: colors.surfaceRaised },
  coverFallback: { width: '100%', height: 8, backgroundColor: colors.accentSoft },
  body: { padding: spacing.md, gap: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { ...typography.bodyStrong, color: colors.textPrimary, flexShrink: 1, fontSize: 16 },
  client: { ...typography.caption, color: colors.textSecondary },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: radius.full },
  progressLabel: { ...typography.micro, color: colors.textMuted, width: 32, textAlign: 'right' },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { borderWidth: 2, borderColor: colors.surface, borderRadius: 999 },
  moreMembers: { ...typography.micro, color: colors.textMuted, marginLeft: 6 },
  stage: { ...typography.micro, color: colors.textMuted },
})
