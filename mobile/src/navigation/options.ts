import { typography, type AppColors } from '../constants/theme'

export function stackScreenOptions(colors: AppColors) {
  return {
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
}

/**
 * Create flows as a native form-sheet popup over the current screen.
 */
export function formSheetOptions(colors: AppColors, title: string) {
  return {
    headerShown: false as const,
    title,
    presentation: 'formSheet' as const,
    sheetAllowedDetents: [0.88] as number[],
    sheetInitialDetentIndex: 0 as const,
    sheetGrabberVisible: true,
    sheetCornerRadius: 22,
    sheetExpandsWhenScrolledToEdge: true,
    contentStyle: { backgroundColor: colors.canvas },
  }
}
