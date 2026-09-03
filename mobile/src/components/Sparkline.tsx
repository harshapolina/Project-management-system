import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Line, Path } from 'react-native-svg'
import { spacing, typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'

export type TrendPoint = { date: string; points: number }

function buildPath(values: number[], w: number, h: number, pad: number) {
  if (values.length === 0) return { line: '', area: '', pts: [] as { x: number; y: number }[] }
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const innerW = w - pad * 2
  const innerH = h - pad * 2
  const step = values.length > 1 ? innerW / (values.length - 1) : 0

  const pts = values.map((v, i) => ({
    x: pad + i * step,
    y: pad + innerH - ((v - min) / span) * innerH,
  }))

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${(h - pad).toFixed(1)} L${pts[0].x.toFixed(1)},${(h - pad).toFixed(1)} Z`
  return { line, area, pts }
}

/**
 * 30-day impact trend. Draws an area under the line and marks the last
 * point, so a flat run still reads as data rather than an empty box.
 */
export function Sparkline({
  data,
  height = 84,
  width = 300,
  label,
}: {
  data: TrendPoint[]
  height?: number
  width?: number
  label?: string
}) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const values = data.map((d) => Number(d.points) || 0)
  const total = values.reduce((s, v) => s + v, 0)
  const peak = values.length ? Math.max(...values) : 0
  const { line, area, pts } = useMemo(
    () => buildPath(values, width, height, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, width, height],
  )

  if (!values.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No points scored in the last 30 days.</Text>
      </View>
    )
  }

  const last = pts[pts.length - 1]

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.total}>{total} pts</Text>
        <Text style={styles.meta}>{label || 'last 30 days'}</Text>
      </View>
      <Svg width={width} height={height}>
        <Line
          x1={8}
          y1={height - 8}
          x2={width - 8}
          y2={height - 8}
          stroke={colors.border}
          strokeWidth={1}
        />
        <Path d={area} fill={colors.accent} fillOpacity={0.12} />
        <Path d={line} fill="none" stroke={colors.accent} strokeWidth={2} strokeLinejoin="round" />
        {last ? <Circle cx={last.x} cy={last.y} r={3.5} fill={colors.accent} /> : null}
      </Svg>
      <Text style={styles.meta}>Best day {peak} pts</Text>
    </View>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    wrap: { gap: 6 },
    head: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
    total: { ...typography.h3, color: c.textPrimary },
    meta: { ...typography.caption, color: c.textMuted },
    empty: { paddingVertical: spacing.lg },
    emptyText: { ...typography.caption, color: c.textMuted },
  })
}
