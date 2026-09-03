import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Alert, Platform } from 'react-native'

/**
 * Writing a file and handing it to the share sheet is the mobile equivalent
 * of the web client's `<a download>` — there is no Downloads folder to drop
 * into, so every export ends in the system share/save sheet.
 */
async function shareLocalFile(uri: string, mimeType: string, dialogTitle: string) {
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('Sharing unavailable', 'This device cannot share files.')
    return false
  }
  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle,
    UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined,
  })
  return true
}

function safeName(name: string) {
  return name.replace(/[^\w.\- ]+/g, '').trim() || 'export'
}

function writeCacheFile(
  name: string,
  content: string,
  encoding: 'utf8' | 'base64',
): string {
  const file = new File(Paths.cache, safeName(name))
  // A previous export with the same name would otherwise make create() throw.
  try {
    if (file.exists) file.delete()
  } catch {
    // a stale handle is not worth failing the export over
  }
  file.create()
  file.write(content, { encoding })
  return file.uri
}

/** RFC-4180 escaping — quotes doubled, every field quoted. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`
  return rows.map((row) => row.map(escape).join(',')).join('\n')
}

export async function exportCsv(fileName: string, rows: (string | number | null | undefined)[][]) {
  const uri = writeCacheFile(
    fileName.endsWith('.csv') ? fileName : `${fileName}.csv`,
    toCsv(rows),
    'utf8',
  )
  return shareLocalFile(uri, 'text/csv', 'Export CSV')
}

/** `base64` is an XLSX workbook written by SheetJS (`XLSX.write(wb, {type:'base64'})`). */
export async function exportXlsxBase64(fileName: string, base64: string) {
  const uri = writeCacheFile(
    fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`,
    base64,
    'base64',
  )
  return shareLocalFile(
    uri,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Export spreadsheet',
  )
}

export async function sharePdf(uri: string, dialogTitle = 'Share PDF') {
  return shareLocalFile(uri, 'application/pdf', dialogTitle)
}

/** Stamp used in every export filename, e.g. `team-report-2026-09-02.csv`. */
export function todayStamp() {
  return new Date().toISOString().slice(0, 10)
}

export const canShareFiles = Platform.OS !== 'web'
