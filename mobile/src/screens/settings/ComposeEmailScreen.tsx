import { useMemo, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { workspaceMailApi } from '../../api/workspaceMail'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { MoreStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<MoreStackParamList, 'ComposeEmail'>

/**
 * Send a pre-filled email through the workspace SMTP — the mobile counterpart
 * of the web's compose popup. Drafts come in as route params from a PO, RFQ,
 * vendor or project.
 */
export function ComposeEmailScreen({ route, navigation }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const draft = route.params

  const [to, setTo] = useState(draft.to || '')
  const [subject, setSubject] = useState(draft.subject || '')
  const [body, setBody] = useState(draft.body || '')
  const [error, setError] = useState('')

  // Sending fails with a clear message when SMTP is off, but warning up front
  // saves a wasted round trip.
  const settings = useQuery({
    queryKey: ['workspace-mail-settings'],
    queryFn: workspaceMailApi.settings,
  })
  const smtpReady = settings.data?.settings?.enabled && settings.data?.settings?.passwordSet

  const send = useMutation({
    mutationFn: () =>
      workspaceMailApi.compose({ to: to.trim(), subject: subject.trim(), body: body.trim() }),
    onSuccess: (res) => {
      Alert.alert('Email sent', `Delivered to ${res.sentTo.join(', ')} from ${res.from}.`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ])
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not send the email'),
  })

  return (
    <FormLayout
      title={draft.title || 'New message'}
      subtitle="Sends from your company email"
      subtitleIcon="mail-outline"
      footer={
        <Button
          title="Send email"
          onPress={() => {
            if (!to.trim()) {
              setError('Add at least one recipient')
              return
            }
            if (!subject.trim()) {
              setError('Subject is required')
              return
            }
            if (!body.trim()) {
              setError('Write a message first')
              return
            }
            setError('')
            send.mutate()
          }}
          loading={send.isPending}
          fullWidth
        />
      }
    >
      {settings.isFetched && !smtpReady ? (
        <View style={styles.warn}>
          <Ionicons name="warning-outline" size={14} color={colors.warning} />
          <Text style={styles.warnText}>
            Company email is not set up yet. An admin can add SMTP under Settings → Email &amp;
            alerts.
          </Text>
        </View>
      ) : null}

      <Input
        label="To"
        placeholder="name@company.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={to}
        onChangeText={setTo}
        hint="Separate several addresses with a comma"
      />
      <Input label="Subject" value={subject} onChangeText={setSubject} />
      <Input
        label="Message"
        value={body}
        onChangeText={setBody}
        multiline
        style={styles.bodyInput}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    warn: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: 12,
      backgroundColor: c.warningSoft,
    },
    warnText: { ...typography.micro, color: c.textSecondary, flex: 1 },
    bodyInput: { minHeight: 180, textAlignVertical: 'top' },
    error: { ...typography.caption, color: c.danger },
  })
}
