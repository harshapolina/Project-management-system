import { useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Input } from './Input'
import { spacing, typography } from '../constants/theme'
import { useColors } from '../theme/useColors'

export function MentionInput({
  value,
  onChangeText,
  users,
  placeholder,
}: {
  value: string
  onChangeText: (v: string) => void
  users: { _id: string; name: string }[]
  placeholder?: string
}) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [showPicker, setShowPicker] = useState(false)

  const insertMention = (name: string) => {
    onChangeText(`${value}${value.endsWith(' ') || !value ? '' : ' '}@${name} `)
    setShowPicker(false)
  }

  return (
    <View>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline
        numberOfLines={3}
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />
      <Pressable onPress={() => setShowPicker(true)} style={styles.mentionBtn}>
        <Text style={styles.mentionText}>@ Mention</Text>
      </Pressable>
      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowPicker(false)}>
          <View style={styles.sheet}>
            <FlatList
              data={users}
              keyExtractor={(u) => u._id}
              renderItem={({ item }) => (
                <Pressable onPress={() => insertMention(item.name)} style={styles.userRow}>
                  <Text style={{ color: colors.textPrimary }}>{item.name}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

function createStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    mentionBtn: { alignSelf: 'flex-start', marginTop: spacing.xs },
    mentionText: { ...typography.caption, color: c.accent, fontWeight: '600' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.surface, maxHeight: 320, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.md },
    userRow: { paddingVertical: spacing.sm },
  })
}
