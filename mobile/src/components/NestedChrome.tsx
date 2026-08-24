import type { ReactNode, ComponentProps } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { AppNavBar } from './AppNavBar'
import { PageHeader } from './PageHeader'
import { Screen } from './Screen'

type NestedChromeProps = {
  title: string
  subtitle?: string
  subtitleIcon?: ComponentProps<typeof Ionicons>['name']
  onBack: () => void
  right?: ReactNode
  children: ReactNode
  edges?: ('top' | 'right' | 'bottom' | 'left')[]
  keyboardAvoiding?: boolean
  background?: string
}

/**
 * Shared nested-screen chrome: global AppNavBar + PageHeader with back.
 * Tab roots keep AppNavBar without onBack; form sheets use FormLayout instead.
 */
export function NestedChrome({
  title,
  subtitle,
  subtitleIcon,
  onBack,
  right,
  children,
  edges = ['left', 'right'],
  keyboardAvoiding,
  background,
}: NestedChromeProps) {
  return (
    <Screen padded={false} edges={edges} keyboardAvoiding={keyboardAvoiding} background={background}>
      <AppNavBar />
      <PageHeader
        title={title}
        subtitle={subtitle}
        subtitleIcon={subtitleIcon}
        onBack={onBack}
        right={right}
      />
      {children}
    </Screen>
  )
}
