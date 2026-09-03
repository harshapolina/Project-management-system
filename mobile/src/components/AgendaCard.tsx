import { useMemo } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { SurfaceCard } from './SurfaceCard'
import { SectionLabel } from './SectionLabel'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'
import { fetchGoogleCalendarEvents, getGoogleCalendarStatus } from '../lib/googleCalendar'
import type { GoogleCalendarEvent } from '../types/ops'

function clock(value?: string): string {
  if (!value) return ''
  if (value.length === 10) return 'All day'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function isSameDay(value?: string) {
  if (!value) return false
  const d = new Date(value)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

/**
 * Today's Google Calendar events, above the task list.
 *
 * Renders nothing at all when the workspace has no client ID or nobody has
 * connected — an empty prompt on Home would be noise for most people.
 */
export function AgendaCard({ onConnect }: { onConnect?: () => void }) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const status = useQuery({
    queryKey: ['gcal-status'],
    queryFn: getGoogleCalendarStatus,
    staleTime: 60_000,
  })
  const connected = !!status.data?.connected || !!status.data?.localConnected

  const events = useQuery({
    queryKey: ['gcal-events'],
    queryFn: () => fetchGoogleCalendarEvents(2),
    enabled: connected,
    retry: false,
    staleTime: 5 * 60_000,
  })

  if (!status.data?.configured) return null

  if (!connected) {
    return (
      <View style={styles.block}>
        <SectionLabel>Calendar</SectionLabel>
        <SurfaceCard onPress={onConnect}>
          <View style={styles.row}>
            <View style={styles.icon}>
              <Ionicons name="calendar-outline" size={18} color={colors.accentHover} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title}>Connect Google Calendar</Text>
              <Text style={styles.meta}>See today’s meetings next to your tasks.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </SurfaceCard>
      </View>
    )
  }

  const today = (events.data || []).filter((e: GoogleCalendarEvent) => isSameDay(e.start))
  if (!today.length) return null

  return (
    <View style={styles.block}>
      <SectionLabel count={today.length}>Today’s meetings</SectionLabel>
      <SurfaceCard>
        {today.map((ev, idx) => (
          <Pressable
            key={ev.id}
            style={[styles.eventRow, idx > 0 && styles.rowBorder]}
            onPress={() => ev.htmlLink && Linking.openURL(ev.htmlLink)}
            accessibilityRole="button"
            accessibilityLabel={ev.summary || 'Calendar event'}
          >
            <Text style={styles.time}>{clock(ev.start)}</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title} numberOfLines={1}>
                {ev.summary || '(No title)'}
              </Text>
              {ev.location ? (
                <Text style={styles.meta} numberOfLines={1}>
                  {ev.location}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </SurfaceCard>
    </View>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    block: { gap: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    icon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { ...typography.bodyStrong, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textSecondary },
    rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
    eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10 },
    time: { ...typography.captionStrong, color: c.accentHover, width: 66 },
  })
}
