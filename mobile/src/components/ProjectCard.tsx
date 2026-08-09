import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing, typography } from '../constants/theme'
import { Pill } from './Badge'
import { Avatar } from './Avatar'
import { assetUrl } from '../constants/env'
import type { Project } from '../types/models'

const STATUS_LABEL: Record<string, string> = {
  in_progress: 'In progress',
  completed: 'Completed',
  on_hold: 'On hold',
  delayed: 'Delayed',
}

export function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const statusKey = project.isDelayed ? 'delayed' : project.status
  const statusColor = colors.status[statusKey] || colors.textMuted
  const memberCount = project.members?.length || 0

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
    >
      <Image source={{ uri: assetUrl(project.coverImage) || undefined }} style={styles.cover} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {project.name}
          </Text>
          <Pill label={STATUS_LABEL[statusKey] || statusKey} color={statusColor} bg={`${statusColor}22`} />
        </View>
        <Text style={styles.client} numberOfLines={1}>
          {project.clientName}
          {project.location ? ` · ${project.location}` : ''}
        </Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, project.progress || 0)}%` }]} />
        </View>

        <View style={styles.footerRow}>
          <View style={styles.avatarStack}>
            {(project.members || []).slice(0, 3).map((m, i) => (
              <View key={m.user._id} style={[styles.avatarWrap, { marginLeft: i === 0 ? 0 : -10 }]}>
                <Avatar name={m.user.name} uri={m.user.avatar} size={24} />
              </View>
            ))}
            {memberCount > 3 ? <Text style={styles.moreMembers}>+{memberCount - 3}</Text> : null}
          </View>
          <Text style={styles.stage} numberOfLines={1}>
            {project.currentStage}
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
  },
  cover: { width: '100%', height: 110, backgroundColor: colors.surfaceRaised },
  body: { padding: spacing.md, gap: spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { ...typography.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
  client: { ...typography.caption, color: colors.textSecondary },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { borderWidth: 2, borderColor: colors.surface, borderRadius: 999 },
  moreMembers: { ...typography.micro, color: colors.textMuted, marginLeft: 6 },
  stage: { ...typography.micro, color: colors.textMuted, textTransform: 'capitalize' },
})
