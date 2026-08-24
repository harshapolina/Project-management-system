import 'react-native-gesture-handler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RootNavigator } from './src/navigation/RootNavigator'
import { LiveToastHost } from './src/components/LiveToast'
import { useColors } from './src/theme/useColors'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function ThemedAppShell({ children }: { children: React.ReactNode }) {
  const colors = useColors()
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.canvas }}>
      {children}
    </GestureHandlerRootView>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemedAppShell>
          <RootNavigator />
          <LiveToastHost />
        </ThemedAppShell>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
