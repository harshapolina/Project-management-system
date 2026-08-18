import type { ApiError } from './models'

// Our axios client (src/api/client.ts) rejects every failed request with an
// ApiError object, never a plain Error. This registers that as the default
// TError across every useQuery/useMutation call so `error` is typed
// correctly without repeating a generic at every call site.
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError
  }
}
