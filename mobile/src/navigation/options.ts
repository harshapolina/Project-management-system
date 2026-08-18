import { Platform } from 'react-native'
import { colors, typography } from '../constants/theme'

export const stackScreenOptions = {
  headerTintColor: colors.textPrimary,
  headerTitleStyle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  headerBackTitle: 'Back',
  headerStyle: { backgroundColor: colors.canvas },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.canvas },
  animation: 'slide_from_right' as const,
}

export const tabBarOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.accent,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: -2,
    marginBottom: Platform.OS === 'ios' ? 0 : 4,
  },
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
}
