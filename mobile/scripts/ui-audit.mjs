/**
 * Static UI theme + responsiveness audit for the mobile app.
 * Run: node scripts/ui-audit.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src')

const OLD_BLUES = ['#2563EB', '#2563eb', '#EFF4FF', '#DBEAFE', '#E6F4FE', '#0B1220', '#F6F7F9']
const FORBIDDEN_FAB = ["color=\"#fff\"", "shadowColor: '#000'"]

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc)
    else if (/\.(tsx|ts|json)$/.test(entry.name)) acc.push(full)
  }
  return acc
}

const files = walk(SRC).concat([path.join(ROOT, 'app.json'), path.join(ROOT, 'App.tsx')])
const screens = files.filter((f) => f.includes(`${path.sep}screens${path.sep}`) && f.endsWith('.tsx'))
const errors = []
const warnings = []

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  const rel = path.relative(ROOT, file)
  for (const hex of OLD_BLUES) {
    if (text.includes(hex)) errors.push(`${rel}: leftover old-blue token ${hex}`)
  }
  if (rel.endsWith('.tsx') && FORBIDDEN_FAB.some((s) => text.includes(s) && text.includes('fab'))) {
    // only flag if fab style block still present
    if (/fab:\s*\{/.test(text) || /styles\.fab/.test(text)) {
      errors.push(`${rel}: leftover inline FAB styles / white icon`)
    }
  }
}

const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'))
if (!appJson.expo.splash?.backgroundColor) errors.push('app.json: missing splash.backgroundColor')
if (appJson.expo.android?.adaptiveIcon?.backgroundColor?.toLowerCase() === '#e6f4fe') {
  errors.push('app.json: adaptiveIcon still old blue')
}
if (appJson.expo.userInterfaceStyle !== 'automatic') {
  warnings.push('app.json: userInterfaceStyle should be automatic')
}

let missingUseColors = 0
for (const file of screens) {
  const text = fs.readFileSync(file, 'utf8')
  const rel = path.relative(ROOT, file)
  const needsTheme =
    /StyleSheet\.create/.test(text) &&
    (/backgroundColor|color:|borderColor|tintColor|shadowColor/.test(text) ||
      /createStyles\(/.test(text))
  if (needsTheme && !text.includes('useColors')) {
    // Section components may use static hero tokens from theme
    if (rel.includes(`${path.sep}sections${path.sep}`) && text.includes('heroFor')) {
      continue
    }
    // MoreMain is layout-only exception if no color styles
    if (!/createStyles\(|backgroundColor: c\.|color: c\./.test(text)) {
      warnings.push(`${rel}: no useColors (layout-only OK if children are themed)`)
    } else {
      errors.push(`${rel}: themed styles without useColors`)
      missingUseColors++
    }
  }
}

// NestedChrome adoption + layout checks
const TAB_ROOT_SCREENS = new Set([
  'HomeScreen.tsx',
  'MoreMainScreen.tsx',
  'ProjectsListScreen.tsx',
  'ProjectOverviewScreen.tsx',
  'ThreadsScreen.tsx',
  'InboxHubScreen.tsx',
  'DocsScreen.tsx',
])

for (const file of screens) {
  const text = fs.readFileSync(file, 'utf8')
  const rel = path.relative(ROOT, file)
  const base = path.basename(file)

  if (text.includes('onBack') && text.includes('AppNavBar') && text.includes('PageHeader') && !text.includes('NestedChrome')) {
    if (!TAB_ROOT_SCREENS.has(base)) {
      errors.push(`${rel}: manual chrome with onBack — use NestedChrome`)
    }
  }

  if (/FlatList|ScrollView/.test(text) && text.includes('AppNavBar') && !text.includes('listContent') && !text.includes('tabListContent') && !text.includes('NestedChrome')) {
    if (!TAB_ROOT_SCREENS.has(base) && !text.includes('FormLayout')) {
      warnings.push(`${rel}: scroll list may miss tab-bar clearance (listContent)`)
    }
  }

  if (text.includes('NestedChrome') && /\bscroll\b/.test(text) && text.includes('KanbanBoard')) {
    warnings.push(`${rel}: KanbanBoard inside NestedChrome scroll — use ChromeFill + flex layout instead`)
  }

  // Hardcoded hex outside theme (screens only)
  if (!rel.includes('constants/theme.ts')) {
    const hexMatches = text.match(/#[0-9a-fA-F]{3,8}/g) || []
    const allowed = new Set(['#fff', '#ffffff', '#000', '#000000'])
    for (const hex of hexMatches) {
      const lower = hex.toLowerCase()
      if (allowed.has(lower)) continue
      if (OLD_BLUES.includes(hex) || OLD_BLUES.includes(lower)) continue
      // theme.ts re-exports in imports are OK
      if (/from ['"].*theme['"]/.test(text) && text.includes(hex)) continue
      warnings.push(`${rel}: hardcoded hex ${hex} — prefer theme tokens`)
      break
    }
  }
}

// Web lint hint (client pages)
const clientPages = path.join(ROOT, '..', 'client', 'src', 'pages')
if (fs.existsSync(clientPages)) {
  let applePanels = 0
  for (const file of walk(clientPages)) {
    if (!file.endsWith('.jsx')) continue
    const text = fs.readFileSync(file, 'utf8')
    if (text.includes('bg-[#fbfbfd]') || text.includes('ring-black/[0.04]')) applePanels++
  }
  if (applePanels > 0) {
    warnings.push(`client pages: ${applePanels} file(s) still use Apple-panel hex patterns`)
  }
}

for (const must of [
  'src/theme/useResponsive.ts',
  'src/components/Fab.tsx',
  'src/theme/useColors.ts',
  'src/store/uiStore.ts',
]) {
  if (!fs.existsSync(path.join(ROOT, must))) errors.push(`missing ${must}`)
}

const screenCount = screens.length
console.log(`UI audit — ${screenCount} screens scanned`)
if (errors.length) {
  console.log(`\nFAIL (${errors.length}):`)
  for (const e of errors) console.log('  ✗', e)
  process.exitCode = 1
} else {
  console.log('\nPASS: no old-blue tokens, splash configured, themed screens OK')
}
if (warnings.length) {
  console.log(`\nWARNINGS (${warnings.length}):`)
  for (const w of warnings) console.log('  •', w)
}

// Device width matrix (logical) — document expected layout behavior
const devices = [
  { name: 'iPhone SE', width: 320 },
  { name: 'iPhone 13 mini', width: 375 },
  { name: 'iPhone 15', width: 393 },
  { name: 'iPhone 15 Pro Max', width: 430 },
  { name: 'Pixel 7', width: 412 },
  { name: 'iPad mini', width: 768 },
]
console.log('\nResponsive matrix (useResponsive):')
for (const d of devices) {
  const isCompact = d.width < 360
  const isTablet = d.width >= 768
  const pagePadding = isCompact ? 12 : 16
  const statsColumns = d.width < 340 ? 1 : 2
  const contentMax = isTablet ? 720 : 'fluid'
  console.log(
    `  ${d.name.padEnd(18)} w=${String(d.width).padStart(3)}  pad=${pagePadding}  statsCols=${statsColumns}  maxWidth=${contentMax}`,
  )
}

// Web parity — key routes must exist in navigation types
const typesText = fs.readFileSync(path.join(SRC, 'navigation/types.ts'), 'utf8')
const parityRoutes = [
  'InboxHub',
  'SiteSupervisor',
  'Docs',
  'MaterialsHub',
  'RfqDetail',
  'LeadDetail',
  'EditProject',
  'InvoiceDetail',
  'PlatformOverview',
  'BoqMeasurement',
  'Register',
]
console.log('\nParity routes (navigation/types.ts):')
for (const route of parityRoutes) {
  if (!typesText.includes(route)) errors.push(`types.ts: missing parity route ${route}`)
  else console.log(`  ✓ ${route}`)
}
