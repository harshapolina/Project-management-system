import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { FormLayout } from '../../components/FormLayout'
import { Input } from '../../components/Input'
import { Button } from '../../components/Button'
import { Avatar } from '../../components/Avatar'
import { spacing, typography, type AppColors } from '../../constants/theme'
import { useColors } from '../../theme/useColors'
import { authApi } from '../../api/auth'
import { mediaApi } from '../../api/media'
import { useAuthStore } from '../../store/authStore'
import { isApiError } from '../../api/client'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { ProfileStackParamList } from '../../navigation/types'

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditProfile'>

export function EditProfileScreen({ navigation, route }: Props) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [title, setTitle] = useState(user?.title || '')
  const [company, setCompany] = useState(user?.company || '')
  const [error, setError] = useState('')

  /**
   * The photo saves on its own rather than waiting for "Save changes".
   * Picking an image is a deliberate act with visible feedback, and the upload
   * has to finish before we have a URL to store anyway — so holding it back
   * behind the form's save button would only add a way to lose it.
   */
  const avatarMutation = useMutation({
    mutationFn: async (asset: { uri: string; name: string; mimeType?: string }) => {
      const media = await mediaApi.uploadImage(asset)
      return authApi.updateMe({ avatar: media.url })
    },
    onSuccess: (data) => {
      setUser(data.user)
      setError('')
    },
    onError: (err) =>
      setError(isApiError(err) ? err.message : 'Could not update your photo'),
  })

  const removeAvatar = useMutation({
    mutationFn: () => authApi.updateMe({ avatar: '' }),
    onSuccess: (data) => setUser(data.user),
    onError: (err) =>
      setError(isApiError(err) ? err.message : 'Could not remove your photo'),
  })

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(
        'Photo access needed',
        'Allow photo access in Settings to choose a profile picture.',
      )
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      /**
       * Deliberately no `allowsEditing`. That hands cropping to whatever editor
       * the OS provides — which varies by Android skin and often has no zoom —
       * so we take the full-size original and run our own adjust step, where
       * the circle mask shows the avatar as it will actually appear.
       */
      allowsEditing: false,
      quality: 1,
    })
    if (result.canceled || !result.assets?.[0]) return

    navigation.navigate('CropAvatar', { uri: result.assets[0].uri })
  }

  /**
   * The adjust screen merges the cropped file back into this screen's params.
   * Clearing it before uploading matters: params survive re-renders, so leaving
   * it set would re-upload the same crop every time this screen re-rendered.
   */
  const croppedAvatarUri = route.params?.croppedAvatarUri
  useEffect(() => {
    if (!croppedAvatarUri) return
    navigation.setParams({ croppedAvatarUri: undefined })
    avatarMutation.mutate({
      uri: croppedAvatarUri,
      name: 'profile.jpg',
      mimeType: 'image/jpeg',
    })
    // avatarMutation is recreated each render; depending on it would re-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [croppedAvatarUri])

  const confirmRemove = () =>
    Alert.alert('Remove your photo?', 'Your initials will be shown instead.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeAvatar.mutate() },
    ])

  const mutation = useMutation({
    mutationFn: () =>
      authApi.updateMe({
        name: name.trim(),
        phone: phone.trim(),
        title: title.trim(),
        company: company.trim(),
      }),
    onSuccess: (data) => {
      setUser(data.user)
      navigation.goBack()
    },
    onError: (err) => setError(isApiError(err) ? err.message : 'Could not update profile'),
  })

  const busy = avatarMutation.isPending || removeAvatar.isPending

  return (
    <FormLayout
      title="Edit profile"
      subtitle="Photo, name, and contact"
      subtitleIcon="person-outline"
      variant="page"

      footer={
        <Button
          title="Save changes"
          onPress={() => {
            if (!name.trim()) {
              setError('Name is required')
              return
            }
            setError('')
            mutation.mutate()
          }}
          loading={mutation.isPending}
          fullWidth
        />
      }
    >
      <View style={styles.avatarBlock}>
        <Pressable
          onPress={pickAvatar}
          disabled={busy}
          style={styles.avatarWrap}
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
        >
          <Avatar name={user?.name} uri={user?.avatar} size={88} />
          <View style={styles.avatarBadge}>
            {avatarMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.textOnAccent} />
            ) : (
              <Ionicons name="camera" size={15} color={colors.textOnAccent} />
            )}
          </View>
        </Pressable>

        <View style={styles.avatarActions}>
          <Pressable onPress={pickAvatar} disabled={busy} hitSlop={6}>
            <Text style={styles.avatarAction}>
              {user?.avatar ? 'Change photo' : 'Add a photo'}
            </Text>
          </Pressable>
          {!!user?.avatar && (
            <>
              <Text style={styles.avatarDivider}>·</Text>
              <Pressable onPress={confirmRemove} disabled={busy} hitSlop={6}>
                <Text style={styles.avatarRemove}>Remove</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      <Input label="Name" value={name} onChangeText={setName} />
      <Input label="Title" placeholder="e.g. Senior Project Manager" value={title} onChangeText={setTitle} />
      <Input label="Company" value={company} onChangeText={setCompany} />
      <Input label="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </FormLayout>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    avatarBlock: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
    avatarWrap: { position: 'relative' },
    avatarBadge: {
      position: 'absolute',
      right: -2,
      bottom: -2,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.surface,
    },
    avatarActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    avatarAction: { ...typography.captionStrong, color: c.accent },
    avatarDivider: { ...typography.caption, color: c.textMuted },
    avatarRemove: { ...typography.captionStrong, color: c.danger },

    error: { ...typography.caption, color: c.danger, marginTop: spacing.sm },
  })
}
