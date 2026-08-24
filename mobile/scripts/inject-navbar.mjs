/**
 * Inject AppNavBar into nested screens that have PageHeader + onBack.
 * Run from mobile/: node scripts/inject-navbar.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../src/screens')

const SKIP = new Set([
  'HomeScreen.tsx',
  'ProjectsListScreen.tsx',
  'ThreadsScreen.tsx',
  'MoreMainScreen.tsx',
  'LoginScreen.tsx',
  'ForgotPasswordScreen.tsx',
  'OnboardingScreen.tsx',
  'ForceChangePasswordScreen.tsx',
  'NewMessageScreen.tsx',
])

function walk(dir) {
  const out = []
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) out.push(...walk(p))
    else if (name.endsWith('Screen.tsx')) out.push(p)
  }
  return out
}

let changed = 0
for (const file of walk(root)) {
  const base = path.basename(file)
  if (SKIP.has(base)) continue
  let src = fs.readFileSync(file, 'utf8')
  if (src.includes('AppNavBar')) continue
  if (!src.includes('<PageHeader')) continue
  if (!/onBack=\{/.test(src)) continue

  // Import
  if (src.includes("from '../../components/PageHeader'")) {
    src = src.replace(
      "import { PageHeader } from '../../components/PageHeader'\n",
      "import { AppNavBar } from '../../components/AppNavBar'\nimport { PageHeader } from '../../components/PageHeader'\n",
    )
  } else if (src.includes("from '../components/PageHeader'")) {
    src = src.replace(
      "import { PageHeader } from '../components/PageHeader'\n",
      "import { AppNavBar } from '../components/AppNavBar'\nimport { PageHeader } from '../components/PageHeader'\n",
    )
  }

  // Insert AppNavBar immediately before every PageHeader JSX open tag
  src = src.replace(/(^[ \t]*)<PageHeader\b/gm, '$1<AppNavBar />\n$1<PageHeader')

  // Safe-area: AppNavBar owns top
  src = src.replace(/edges=\{\['top', 'left', 'right'\]\}/g, "edges={['left', 'right']}")
  src = src.replace(/edges=\{\['top', 'left', 'right', 'bottom'\]\}/g, "edges={['left', 'right']}")

  fs.writeFileSync(file, src)
  changed++
  console.log('updated', path.relative(root, file))
}

console.log(`Done. Updated ${changed} files.`)
