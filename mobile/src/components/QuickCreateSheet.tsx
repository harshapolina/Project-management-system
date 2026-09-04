import { useMemo } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs'
import { radius, spacing, typography, type AppColors } from '../constants/theme'
import { useColors, useShadows } from '../theme/useColors'
import { useAuthStore } from '../store/authStore'
import { capabilitiesForUser } from '../utils/roles'
import type { RootTabParamList } from '../navigation/types'
import { type Glyph } from '../icons'
import { Icon } from './Icon'

type Nav = BottomTabNavigationProp<RootTabParamList>

type Action = {
  key: string
  label: string
  hint: string
  icon: Glyph
  onPress: () => void
}

type QuickCreateSheetProps = {
  visible: boolean
  onClose: () => void
  navigation: Nav
}

/** Action sheet from the center + FAB; each row opens a form-sheet create screen. */
export function QuickCreateSheet({ visible, onClose, navigation }: QuickCreateSheetProps) {
  const colors = useColors()
  const shadows = useShadows()
  const insets = useSafeAreaInsets()
  const user = useAuthStore((s) => s.user)
  const caps = useMemo(() => capabilitiesForUser(user), [user])
  const styles = useMemo(() => createStyles(colors, shadows), [colors, shadows])

  const actions = useMemo((): Action[] => {
    const go = (tab: keyof RootTabParamList, screen: string, params?: object) => {
      onClose()
      // Let the Create sheet dismiss, then present the form as a popup
      setTimeout(() => {
        navigation.navigate(tab, { screen, params } as never)
      }, 280)
    }

    const list: Action[] = []

    if (caps.createTask) {
      list.push({
        key: 'task',
        label: 'New task',
        hint: 'Add something to get done',
        icon: 'checkbox-outline',
        onPress: () => go('Home', 'CreateTask', { isPersonal: true }),
      })
    }
    if (caps.createProject) {
      list.push({
        key: 'project',
        label: 'New project',
        hint: 'Start a client workspace',
        icon: 'folder-outline',
        onPress: () => go('Projects', 'CreateProject'),
      })
    }
    if (caps.siteFeed) {
      list.push({
        key: 'update',
        label: 'Post site update',
        hint: 'Share progress from the field',
        icon: 'camera-outline',
        onPress: () => go('More', 'PostSiteUpdate'),
      })
    }
    if (caps.leads) {
      list.push({
        key: 'lead',
        label: 'New enquiry',
        hint: 'Capture a lead',
        icon: 'briefcase-outline',
        onPress: () => go('More', 'CreateLead'),
      })
    }
    if (caps.finance) {
      list.push({
        key: 'expense',
        label: 'Log expense',
        hint: 'Record a project cost',
        icon: 'wallet-outline',
        onPress: () => go('More', 'CreateExpense'),
      })
    }
    if (caps.procurement) {
      list.push({
        key: 'vendor',
        label: 'Add vendor',
        hint: 'Save a supplier contact',
        icon: 'storefront-outline',
        onPress: () => go('More', 'CreateVendor'),
      })
    }

    if (list.length === 0) {
      list.push({
        key: 'task-fallback',
        label: 'New task',
        hint: 'Add something to get done',
        icon: 'checkbox-outline',
        onPress: () => go('Home', 'CreateTask', { isPersonal: true }),
      })
    }

    return list
  }, [caps, navigation, onClose])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss">
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Create</Text>
          <Text style={styles.subtitle}>Choose what you want to add</Text>
          <View style={styles.list}>
            {actions.map((action) => (
              <Pressable
                key={action.key}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.iconWell}>
                  <Icon name={action.icon} size="button" color={colors.accentHover} decorative />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{action.label}</Text>
                  <Text style={styles.rowHint}>{action.hint}</Text>
                </View>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function createStyles(c: AppColors, sh: ReturnType<typeof useShadows>) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      gap: spacing.xs,
      ...sh.floating,
    },
    handle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: radius.full,
      backgroundColor: c.borderLight,
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.h2,
      fontSize: 20,
      color: c.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      color: c.textSecondary,
      marginBottom: spacing.sm,
    },
    list: {
      gap: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: radius.lg,
    },
    rowPressed: {
      backgroundColor: c.surfaceRaised,
    },
    iconWell: {
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    rowLabel: {
      ...typography.bodyStrong,
      color: c.textPrimary,
    },
    rowHint: {
      ...typography.caption,
      color: c.textMuted,
    },
    cancel: {
      marginTop: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      height: 52,
      borderRadius: radius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    cancelText: {
      ...typography.bodyStrong,
      fontSize: 16,
      lineHeight: 20,
      color: c.textPrimary,
      letterSpacing: -0.2,
    },
  })
}
