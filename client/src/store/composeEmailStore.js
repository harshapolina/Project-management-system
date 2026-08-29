import { create } from 'zustand'

/**
 * Global compose drawer — open from anywhere (client Send, PO, RFQ, vendor).
 * draft: { to, subject, body, title? }
 */
export const useComposeEmailStore = create((set) => ({
  open: false,
  draft: {
    to: '',
    subject: '',
    body: '',
    title: 'New message',
  },
  openCompose: (draft = {}) =>
    set({
      open: true,
      draft: {
        to: draft.to || '',
        subject: draft.subject || '',
        body: draft.body || '',
        title: draft.title || 'New message',
      },
    }),
  closeCompose: () => set({ open: false }),
  setDraft: (patch) =>
    set((s) => ({ draft: { ...s.draft, ...patch } })),
}))

export function openComposeEmail(draft) {
  useComposeEmailStore.getState().openCompose(draft)
}
