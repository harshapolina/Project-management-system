import { useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { NestedChrome } from '../../components/NestedChrome'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { SectionLabel } from '../../components/SectionLabel'
import { SurfaceCard } from '../../components/SurfaceCard'
import { SegmentedControl } from '../../components/SegmentedControl'
import { ErrorState, LoadingState } from '../../components/States'
import { radius, spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { useResponsive } from '../../theme/useResponsive'
import { workspaceMailApi, type EventPrefs, type MailSettingsPayload } from '../../api/workspaceMail'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProfileStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProfileStackParamList, 'MailSettings'>

type Tab = 'smtp' | 'alerts'

const TABS: { key: Tab; label: string }[] = [
  { key: 'smtp', label: 'Email account' },
  { key: 'alerts', label: 'Alerts' },
]

/** Which recipients each alert can go to. `daysBefore` is deadline-only. */
const TARGETS: { key: keyof EventPrefs; label: string }[] = [
  { key: 'popup', label: 'In-app popup' },
  { key: 'email', label: 'Send email' },
  { key: 'notifyTarget', label: 'Notify the person involved' },
  { key: 'notifyActor', label: 'Notify whoever triggered it' },
  { key: 'notifyAdmins', label: 'Notify owners & admins' },
]

/**
 * Workspace SMTP and the alert matrix — the mobile counterpart of the web's
 * MailAndAlertsSettings. Read-only for anyone who is not an owner or admin.
 */
export function MailSettingsScreen(_props: Props) {
  const colors = useColors()
  const { listContent } = useResponsive()
  const styles = useMemo(() => createStyles(colors), [colors])
  const qc = useQueryClient()

  const [tab, setTab] = useState<Tab>('smtp')
  /** Null fields fall back to the fetched settings — nothing seeded in an effect. */
  const [edits, setEdits] = useState<MailSettingsPayload>({})
  const [password, setPassword] = useState('')
  const [testTo, setTestTo] = useState('')
  const [error, setError] = useState('')

  const { data, isLoading, isError, error: loadError, refetch } = useQuery({
    queryKey: ['workspace-mail-settings'],
    queryFn: workspaceMailApi.settings,
  })

  const save = useMutation({
    mutationFn: () =>
      workspaceMailApi.update({
        ...edits,
        ...(password.trim() ? { pass: password.trim() } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-mail-settings'] })
      setPassword('')
      setEdits({})
      Alert.alert('Saved', 'Email settings updated for this workspace.')
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not save'),
  })

  const test = useMutation({
    mutationFn: () => workspaceMailApi.test(testTo.trim() || undefined),
    onSuccess: (res) => Alert.alert('Test sent', `A test email went to ${res.sentTo}.`),
    onError: (err) => Alert.alert('Test failed', isApiError(err) ? err.message : 'Check the settings'),
  })

  const chromeProps = {
    title: 'Email & alerts',
    subtitle: 'Company SMTP and who gets notified',
    subtitleIcon: 'mail-outline' as const,
  }

  if (isLoading) {
    return (
      <NestedChrome {...chromeProps}>
        <LoadingState label="Loading settings…" variant="form" />
      </NestedChrome>
    )
  }
  if (isError || !data) {
    return (
      <NestedChrome {...chromeProps}>
        <ErrorState
          message={isApiError(loadError) ? loadError.message : undefined}
          onRetry={() => refetch()}
        />
      </NestedChrome>
    )
  }

  const settings = data.settings
  const canEdit = data.canEdit
  const val = <K extends keyof MailSettingsPayload>(key: K, fallback: MailSettingsPayload[K]) =>
    edits[key] ?? fallback
  const set = <K extends keyof MailSettingsPayload>(key: K, next: MailSettingsPayload[K]) =>
    setEdits((prev) => ({ ...prev, [key]: next }))

  const prefsFor = (key: string): EventPrefs => ({
    ...(settings?.events?.[key] as EventPrefs),
    ...(edits.events?.[key] as Partial<EventPrefs>),
  })

  const setPref = (key: string, field: keyof EventPrefs, next: boolean | number) => {
    setEdits((prev) => ({
      ...prev,
      events: { ...prev.events, [key]: { ...prev.events?.[key], [field]: next } },
    }))
  }

  const dirty = Object.keys(edits).length > 0 || password.trim().length > 0

  return (
    <NestedChrome {...chromeProps}>
      <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      <ScrollView contentContainerStyle={listContent} showsVerticalScrollIndicator={false}>
        {!canEdit ? (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.noticeText}>
              Only an owner or admin can change these. You can see how they are set.
            </Text>
          </View>
        ) : null}

        {tab === 'smtp' ? (
          <>
            <SurfaceCard>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>Send email from this workspace</Text>
                  <Text style={styles.toggleHint}>
                    Turns on outbound email for alerts, quotations and vendor messages.
                  </Text>
                </View>
                <Switch
                  value={!!val('enabled', settings?.enabled)}
                  onValueChange={(v) => set('enabled', v)}
                  disabled={!canEdit}
                  trackColor={{ true: colors.accent }}
                />
              </View>
            </SurfaceCard>

            <SectionLabel>SMTP server</SectionLabel>
            <SurfaceCard>
              <Input
                label="Host"
                autoCapitalize="none"
                editable={canEdit}
                value={String(val('host', settings?.host) ?? '')}
                onChangeText={(v) => set('host', v)}
              />
              <View style={styles.row}>
                <Input
                  label="Port"
                  keyboardType="numeric"
                  editable={canEdit}
                  value={String(val('port', settings?.port) ?? '')}
                  onChangeText={(v) => set('port', Number(v) || 0)}
                  containerStyle={styles.flex}
                />
                <View style={[styles.flex, styles.secureBox]}>
                  <Text style={styles.toggleLabel}>SSL (port 465)</Text>
                  <Switch
                    value={!!val('secure', settings?.secure)}
                    onValueChange={(v) => set('secure', v)}
                    disabled={!canEdit}
                    trackColor={{ true: colors.accent }}
                  />
                </View>
              </View>
              <Input
                label="Username"
                autoCapitalize="none"
                keyboardType="email-address"
                editable={canEdit}
                value={String(val('user', settings?.user) ?? '')}
                onChangeText={(v) => set('user', v)}
              />
              <Input
                label="App password"
                secureTextEntry
                autoCapitalize="none"
                editable={canEdit}
                placeholder={settings?.passwordSet ? '•••••••• (saved)' : 'Paste the app password'}
                value={password}
                onChangeText={setPassword}
                hint={
                  settings?.passwordSet
                    ? 'Leave blank to keep the saved password.'
                    : 'Gmail and Outlook need an app password, not your login password.'
                }
              />
            </SurfaceCard>

            <SectionLabel>Sender identity</SectionLabel>
            <SurfaceCard>
              <Input
                label="From name"
                editable={canEdit}
                value={String(val('fromName', settings?.fromName) ?? '')}
                onChangeText={(v) => set('fromName', v)}
              />
              <Input
                label="From email"
                autoCapitalize="none"
                keyboardType="email-address"
                editable={canEdit}
                value={String(val('fromEmail', settings?.fromEmail) ?? '')}
                onChangeText={(v) => set('fromEmail', v)}
                hint="Defaults to the SMTP username."
              />
            </SurfaceCard>

            {canEdit ? (
              <>
                <SectionLabel>Send a test</SectionLabel>
                <SurfaceCard>
                  <Input
                    label="Send test to"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="Defaults to your own address"
                    value={testTo}
                    onChangeText={setTestTo}
                  />
                  <Button
                    title="Send test email"
                    variant="secondary"
                    onPress={() => test.mutate()}
                    loading={test.isPending}
                    fullWidth
                  />
                </SurfaceCard>
              </>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.intro}>
              For each event, choose whether it raises an in-app popup, sends an email, and who
              hears about it.
            </Text>
            {data.events.map((event) => {
              const prefs = prefsFor(event.key)
              return (
                <SurfaceCard key={event.key}>
                  <Text style={styles.eventLabel}>{event.label}</Text>
                  <Text style={styles.eventHint}>{event.description}</Text>
                  {TARGETS.map((target) => (
                    <View key={String(target.key)} style={styles.prefRow}>
                      <Text style={styles.prefLabel}>{target.label}</Text>
                      <Switch
                        value={!!prefs[target.key]}
                        onValueChange={(v) => setPref(event.key, target.key, v)}
                        disabled={!canEdit}
                        trackColor={{ true: colors.accent }}
                      />
                    </View>
                  ))}
                  {event.key === 'deadline' ? (
                    <View style={styles.daysRow}>
                      <Text style={styles.prefLabel}>Remind this many days before</Text>
                      <View style={styles.daysChips}>
                        {[0, 1, 2, 3, 7].map((days) => (
                          <Pressable
                            key={days}
                            disabled={!canEdit}
                            onPress={() => setPref(event.key, 'daysBefore', days)}
                            style={[
                              styles.dayChip,
                              Number(prefs.daysBefore) === days && styles.dayChipActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayChipText,
                                Number(prefs.daysBefore) === days && styles.dayChipTextActive,
                              ]}
                            >
                              {days === 0 ? 'Same day' : days}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </SurfaceCard>
              )
            })}
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {canEdit ? (
          <Button
            title={dirty ? 'Save changes' : 'Saved'}
            disabled={!dirty}
            onPress={() => {
              setError('')
              save.mutate()
            }}
            loading={save.isPending}
            fullWidth
          />
        ) : null}
      </ScrollView>
    </NestedChrome>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    notice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: c.surfaceRaised,
    },
    noticeText: { ...typography.micro, color: c.textSecondary, flex: 1 },
    intro: { ...typography.caption, color: c.textSecondary },
    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    toggleLabel: { ...typography.bodyStrong, color: c.textPrimary },
    toggleHint: { ...typography.micro, color: c.textMuted, marginTop: 2 },
    row: { flexDirection: 'row', gap: spacing.md },
    flex: { flex: 1 },
    secureBox: { justifyContent: 'center', gap: 6 },
    eventLabel: { ...typography.bodyStrong, color: c.textPrimary },
    eventHint: { ...typography.micro, color: c.textMuted, marginTop: 2, marginBottom: spacing.sm },
    prefRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: 6,
    },
    prefLabel: { ...typography.caption, color: c.textSecondary, flex: 1 },
    daysRow: { marginTop: spacing.sm, gap: spacing.sm },
    daysChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    dayChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: c.surfaceRaised,
    },
    dayChipActive: { backgroundColor: c.accent },
    dayChipText: { ...typography.micro, color: c.textSecondary },
    dayChipTextActive: { color: c.textOnAccent, fontWeight: '700' },
    error: { ...typography.caption, color: c.danger },
  })
}
