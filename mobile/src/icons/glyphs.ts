import { Ionicons } from '@expo/vector-icons'

export type Glyph = keyof typeof Ionicons.glyphMap

/**
 * One glyph per action / feature. Same action → same icon, everywhere.
 * Outline weight matches the rest of the chrome; filled names are only for
 * selected tab items and a handful of status marks on solid fills.
 */
export const glyphs = {
  /* Navigation & chrome */
  back: 'chevron-back',
  close: 'close',
  menu: 'menu-outline',
  more: 'ellipsis-horizontal',
  search: 'search-outline',
  filter: 'filter-outline',
  settings: 'settings-outline',
  help: 'help-circle-outline',
  info: 'information-circle-outline',
  share: 'share-outline',
  notifications: 'notifications-outline',
  profile: 'person-outline',
  home: 'home-outline',
  homeFilled: 'home',
  projects: 'folder-outline',
  projectsFilled: 'folder',
  chat: 'chatbubbles-outline',
  chatFilled: 'chatbubbles',
  grid: 'grid-outline',
  gridFilled: 'grid',
  add: 'add',
  addOutline: 'add-outline',

  /* Chevrons */
  chevronForward: 'chevron-forward',
  chevronDown: 'chevron-down',
  chevronUp: 'chevron-up',

  /* Actions — identical everywhere */
  edit: 'pencil-outline',
  compose: 'create-outline',
  delete: 'trash-outline',
  send: 'paper-plane-outline',
  sendChat: 'arrow-up',
  attach: 'attach-outline',
  copy: 'copy-outline',
  open: 'open-outline',
  download: 'download-outline',
  upload: 'cloud-upload-outline',
  archive: 'archive-outline',
  logout: 'log-out-outline',
  checkmark: 'checkmark',
  refresh: 'refresh-outline',
  undo: 'arrow-undo-outline',
  expand: 'chevron-down',
  collapse: 'chevron-up',

  /* Status */
  success: 'checkmark-circle-outline',
  completed: 'checkmark-done-outline',
  pending: 'time-outline',
  warning: 'warning-outline',
  error: 'close-circle-outline',
  infoFilled: 'information-circle',
  lockFilled: 'lock-closed',

  /* Work */
  task: 'checkbox-outline',
  comment: 'chatbubble-ellipses-outline',
  message: 'chatbubble-outline',
  messages: 'chatbubbles-outline',
  people: 'people-outline',
  personAdd: 'person-add-outline',
  calendar: 'calendar-outline',
  lock: 'lock-closed-outline',
  mail: 'mail-outline',
  phone: 'call-outline',
  whatsapp: 'logo-whatsapp',
  camera: 'camera-outline',
  image: 'image-outline',
  images: 'images-outline',
  document: 'document-outline',
  documentText: 'document-text-outline',
  files: 'document-outline',
  folder: 'folder-outline',
  star: 'star',
  starOutline: 'star-outline',
  flag: 'flag-outline',
  eye: 'eye-outline',
  eyeOff: 'eye-off-outline',
  mic: 'mic-outline',

  /* Product areas */
  enquiry: 'briefcase-outline',
  vendor: 'storefront-outline',
  company: 'business-outline',
  cart: 'cart-outline',
  wallet: 'wallet-outline',
  receipt: 'receipt-outline',
  materials: 'layers-outline',
  inventory: 'cube-outline',
  clipboard: 'clipboard-outline',
  issueOut: 'exit-outline',
  trophy: 'trophy-outline',
  reports: 'bar-chart-outline',
  activity: 'pulse-outline',
  dashboard: 'stats-chart-outline',
  overview: 'speedometer-outline',
  shield: 'shield-outline',
  approvals: 'shield-checkmark-outline',
  server: 'server-outline',
  book: 'book-outline',
  options: 'options-outline',
  siteMode: 'phone-portrait-outline',
  construct: 'construct-outline',
  gift: 'gift-outline',
  moon: 'moon-outline',
  sunny: 'sunny-outline',
  empty: 'file-tray-outline',
  debit: 'return-down-back-outline',
} as const satisfies Record<string, Glyph>

export type GlyphKey = keyof typeof glyphs
