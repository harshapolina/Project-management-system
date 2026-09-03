import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G, Path, Rect } from 'react-native-svg'
import { spacing, typography, type AppColors } from '../constants/theme'
import { useColors } from '../theme/useColors'

/**
 * Small SVG charts — the mobile stand-in for the web's Recharts pie and bar.
 * Deliberately minimal: no animation, no tooltips, legible at phone size.
 */

export interface Slice {
  label: string
  value: number
  color: string
}

function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/** Donut arc from `start` to `end` degrees, as an SVG path. */
function arc(cx: number, cy: number, rOuter: number, rInner: number, start: number, end: number) {
  const large = end - start > 180 ? 1 : 0
  const o1 = polar(cx, cy, rOuter, end)
  const o2 = polar(cx, cy, rOuter, start)
  const i1 = polar(cx, cy, rInner, start)
  const i2 = polar(cx, cy, rInner, end)
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 0 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${rInner} ${rInner} 0 ${large} 1 ${i2.x} ${i2.y}`,
    'Z',
  ].join(' ')
}

export function DonutChart({
  slices,
  size = 148,
  centerLabel,
  centerValue,
}: {
  slices: Slice[]
  size?: number
  centerLabel?: string
  centerValue?: string
}) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const total = slices.reduce((sum, s) => sum + (Number(s.value) || 0), 0)
  const cx = size / 2
  const cy = size / 2
  const rOuter = size / 2 - 2
  const rInner = rOuter * 0.62

  const visible = slices.filter((s) => (Number(s.value) || 0) > 0)
  // Running start angle per slice, without mutating anything during render.
  const paths = visible.map((s, i) => {
    const start = visible.slice(0, i).reduce((sum, prev) => sum + (prev.value / total) * 360, 0)
    const sweep = (s.value / total) * 360
    // A full-circle arc degenerates to a point; draw a ring instead.
    const full = sweep >= 359.99
    return { ...s, full, path: full ? null : arc(cx, cy, rOuter, rInner, start, start + sweep) }
  })

  return (
    <View style={styles.donutWrap}>
      <View>
        <Svg width={size} height={size}>
          {total === 0 ? (
            <Circle
              cx={cx}
              cy={cy}
              r={(rOuter + rInner) / 2}
              stroke={colors.border}
              strokeWidth={rOuter - rInner}
              fill="none"
            />
          ) : (
            <G>
              {paths.map((p) =>
                p.full ? (
                  <Circle
                    key={p.label}
                    cx={cx}
                    cy={cy}
                    r={(rOuter + rInner) / 2}
                    stroke={p.color}
                    strokeWidth={rOuter - rInner}
                    fill="none"
                  />
                ) : p.path ? (
                  <Path key={p.label} d={p.path} fill={p.color} />
                ) : null,
              )}
            </G>
          )}
        </Svg>
        {centerValue ? (
          <View style={[styles.donutCenter, { width: size, height: size }]}>
            <Text style={styles.donutValue}>{centerValue}</Text>
            {centerLabel ? <Text style={styles.donutLabel}>{centerLabel}</Text> : null}
          </View>
        ) : null}
      </View>

      <View style={styles.legend}>
        {slices.map((s) => (
          <View key={s.label} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: s.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {s.label}
            </Text>
            <Text style={styles.legendValue}>{s.value}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export interface Bar {
  label: string
  value: number
  color?: string
}

export function BarChart({ bars, height = 132 }: { bars: Bar[]; height?: number }) {
  const colors = useColors()
  const styles = useMemo(() => createStyles(colors), [colors])

  const max = Math.max(1, ...bars.map((b) => Number(b.value) || 0))
  const barWidth = 26
  const gap = 12
  const width = bars.length * (barWidth + gap)
  const plot = height - 22

  return (
    <View>
      <Svg width={Math.max(width, 1)} height={height}>
        {bars.map((bar, i) => {
          const h = Math.max(2, ((Number(bar.value) || 0) / max) * plot)
          return (
            <Rect
              key={bar.label}
              x={i * (barWidth + gap)}
              y={plot - h}
              width={barWidth}
              height={h}
              rx={4}
              fill={bar.color || colors.accent}
            />
          )
        })}
      </Svg>
      <View style={[styles.barLabels, { width: Math.max(width, 1) }]}>
        {bars.map((bar, i) => (
          <View key={bar.label} style={{ width: barWidth + gap, marginLeft: i === 0 ? 0 : 0 }}>
            <Text style={styles.barValue}>{bar.value}</Text>
            <Text style={styles.barLabel} numberOfLines={1}>
              {bar.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function createStyles(c: AppColors) {
  return StyleSheet.create({
    donutWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    donutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    donutValue: { ...typography.h2, color: c.textPrimary },
    donutLabel: { ...typography.micro, color: c.textMuted },
    legend: { flex: 1, gap: 6, minWidth: 0 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    swatch: { width: 10, height: 10, borderRadius: 3 },
    legendLabel: { ...typography.caption, color: c.textSecondary, flex: 1 },
    legendValue: { ...typography.captionStrong, color: c.textPrimary },
    barLabels: { flexDirection: 'row', marginTop: -18 },
    barValue: { ...typography.micro, color: c.textPrimary, textAlign: 'center', width: 26 },
    barLabel: { ...typography.micro, color: c.textMuted, textAlign: 'center', width: 38, marginLeft: -6 },
  })
}
