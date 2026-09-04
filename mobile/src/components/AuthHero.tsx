import { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg'
import { heroLight } from '../constants/theme'

const HERO = heroLight
const LIME = HERO.lime
const GREEN = HERO.bg
const GREEN_MID = HERO.panel
const nativeDriver = Platform.OS !== 'web'
const appleOut = Easing.bezier(0.22, 1, 0.36, 1)

type IconName = 'check' | 'cal' | 'pin' | 'folder' | 'chart' | 'users'

type AuthHeroProps = {
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

/**
 * Fan of project tiles under the cube — mirrored left/right so the beam reads
 * as a designed composition, not a scattered grid.
 * 0° is straight down from the cube.
 */
const FAN: { deg: number; dist: number; icon: IconName; dur: number }[] = [
  { deg: -50, dist: 0.3, icon: 'cal', dur: 2400 },
  { deg: -22, dist: 0.26, icon: 'check', dur: 2200 },
  { deg: 22, dist: 0.26, icon: 'pin', dur: 2600 },
  { deg: 50, dist: 0.3, icon: 'folder', dur: 2300 },
  { deg: -32, dist: 0.44, icon: 'chart', dur: 2800 },
  { deg: 0, dist: 0.48, icon: 'users', dur: 2500 },
  { deg: 32, dist: 0.44, icon: 'check', dur: 2700 },
]

export function AuthHero({ size = 'md', animated = true }: AuthHeroProps) {
  const dim = size === 'lg' ? 280 : size === 'sm' ? 168 : 220
  const styles = useMemo(() => createStyles(dim), [dim])
  const tileSize = dim * 0.118
  const originX = dim / 2
  const originY = dim * 0.3

  const float = useRef(new Animated.Value(animated ? 0 : 0.5)).current
  const pulse = useRef(new Animated.Value(animated ? 0.5 : 0.7)).current
  const beam = useRef(new Animated.Value(animated ? 0 : 1)).current

  useEffect(() => {
    if (!animated) {
      float.setValue(0.5)
      pulse.setValue(0.7)
      beam.setValue(1)
      return
    }
    const bob = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: nativeDriver,
        }),
      ]),
    )
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: nativeDriver,
        }),
      ]),
    )
    const beamIn = Animated.timing(beam, {
      toValue: 1,
      duration: 700,
      easing: appleOut,
      useNativeDriver: nativeDriver,
    })
    bob.start()
    glow.start()
    beamIn.start()
    return () => {
      bob.stop()
      glow.stop()
      beamIn.stop()
    }
  }, [animated, float, pulse, beam])

  const tiles = FAN.map((t) => {
    const rad = (t.deg * Math.PI) / 180
    const dist = dim * t.dist
    return {
      ...t,
      x: originX + Math.sin(rad) * dist - tileSize / 2,
      y: originY + Math.cos(rad) * dist - tileSize / 2,
      size: tileSize,
    }
  })

  return (
    <View style={styles.root} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.85] }),
            transform: [
              { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.beamWrap,
          {
            opacity: beam,
            transform: [{ scaleY: beam.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }],
          },
        ]}
      >
        <Svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
          <Defs>
            <LinearGradient id="cubic-beam" x1="50%" y1="18%" x2="50%" y2="100%">
              <Stop offset="0%" stopColor={GREEN_MID} stopOpacity="0.3" />
              <Stop offset="50%" stopColor={LIME} stopOpacity="0.16" />
              <Stop offset="100%" stopColor={LIME} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path
            d={`M ${dim * 0.42} ${dim * 0.26} L ${dim * 0.58} ${dim * 0.26} L ${dim * 0.9} ${dim * 0.98} L ${dim * 0.1} ${dim * 0.98} Z`}
            fill="url(#cubic-beam)"
          />
        </Svg>
      </Animated.View>

      <Spark dim={dim} left={dim * 0.46} delay={0} drift={-12} duration={2800} animated={animated} />
      <Spark dim={dim} left={dim * 0.52} delay={700} drift={14} duration={3200} animated={animated} />
      <Spark dim={dim} left={dim * 0.4} delay={1400} drift={8} duration={3000} animated={animated} />
      <Spark dim={dim} left={dim * 0.58} delay={2100} drift={-8} duration={3400} animated={animated} />

      {tiles.map((t, i) => (
        <FlyingTile
          key={`${t.icon}-${i}`}
          x={t.x}
          y={t.y}
          size={t.size}
          icon={t.icon}
          delay={180 + i * 90}
          duration={t.dur}
          animated={animated}
          phase={i % 2 === 0 ? 1 : -1}
        />
      ))}

      <Animated.View
        style={[
          styles.craft,
          {
            transform: [
              { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [6, -10] }) },
              {
                rotate: float.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['-3deg', '3deg'],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.cubeOuter}>
          <View style={styles.cubeFace} />
          <View style={styles.cubeAccent} />
          <View style={styles.cubeDot} />
        </View>
        <View style={styles.saucer}>
          <View style={styles.saucerRing} />
          <View style={styles.saucerCore} />
        </View>
      </Animated.View>
    </View>
  )
}

function FlyingTile({
  x,
  y,
  size,
  icon,
  delay,
  duration,
  animated,
  phase,
}: {
  x: number
  y: number
  size: number
  icon: IconName
  delay: number
  duration: number
  animated: boolean
  phase: number
}) {
  const enter = useRef(new Animated.Value(animated ? 0 : 1)).current
  const drift = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!animated) {
      enter.setValue(1)
      return
    }
    const intro = Animated.timing(enter, {
      toValue: 1,
      duration: 640,
      delay,
      easing: appleOut,
      useNativeDriver: nativeDriver,
    })
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: nativeDriver,
        }),
      ]),
    )
    intro.start(({ finished }) => {
      if (finished) floatLoop.start()
    })
    return () => {
      intro.stop()
      floatLoop.stop()
    }
  }, [animated, delay, duration, drift, enter])

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          zIndex: 1,
        },
        {
          opacity: enter,
          transform: [
            {
              translateY: Animated.add(
                enter.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }),
                drift.interpolate({ inputRange: [0, 1], outputRange: [0, -16 * phase] }),
              ),
            },
            {
              translateX: drift.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 10 * phase],
              }),
            },
            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }) },
            {
              rotate: drift.interpolate({
                inputRange: [0, 1],
                outputRange: ['-8deg', '8deg'],
              }),
            },
          ],
        },
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <TileGlyph size={size} icon={icon} />
      </Svg>
    </Animated.View>
  )
}

function Spark({
  dim,
  left,
  delay,
  drift,
  duration,
  animated,
}: {
  dim: number
  left: number
  delay: number
  drift: number
  duration: number
  animated: boolean
}) {
  const t = useRef(new Animated.Value(0)).current
  const mote = Math.max(5, dim * 0.02)

  useEffect(() => {
    if (!animated) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: nativeDriver,
        }),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: nativeDriver }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [animated, delay, duration, t])

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top: 0,
        width: mote,
        height: mote,
        borderRadius: 99,
        backgroundColor: LIME,
        opacity: t.interpolate({ inputRange: [0, 0.2, 0.75, 1], outputRange: [0, 0.8, 0.45, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [dim * 0.28, dim * 0.88] }) },
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, drift] }) },
          { scale: t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.4, 1.15, 0.3] }) },
        ],
      }}
    />
  )
}

function TileGlyph({ size, icon }: { size: number; icon: IconName }) {
  const r = size * 0.28
  const pad = size * 0.22
  return (
    <>
      <Rect x={0} y={0} width={size} height={size} rx={r} fill="#d8f5e8" />
      {icon === 'check' ? (
        <Path
          d={`M ${pad} ${size * 0.52} L ${size * 0.42} ${size * 0.68} L ${size - pad} ${size * 0.34}`}
          stroke={GREEN}
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {icon === 'cal' ? (
        <>
          <Rect
            x={pad}
            y={pad * 1.05}
            width={size - pad * 2}
            height={size - pad * 2.05}
            rx={2}
            stroke={GREEN}
            strokeWidth={1.4}
            fill="none"
          />
          <Path d={`M ${pad} ${size * 0.42} H ${size - pad}`} stroke={GREEN} strokeWidth={1.4} />
        </>
      ) : null}
      {icon === 'pin' ? (
        <>
          <Circle cx={size / 2} cy={size * 0.4} r={size * 0.16} stroke={GREEN} strokeWidth={1.5} fill="none" />
          <Path
            d={`M ${size / 2} ${size * 0.55} L ${size / 2} ${size * 0.78}`}
            stroke={GREEN}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </>
      ) : null}
      {icon === 'folder' ? (
        <Path
          d={`M ${pad} ${size * 0.38} H ${size * 0.42} L ${size * 0.5} ${size * 0.3} H ${size - pad} V ${size - pad} H ${pad} Z`}
          stroke={GREEN}
          strokeWidth={1.4}
          fill="none"
          strokeLinejoin="round"
        />
      ) : null}
      {icon === 'chart' ? (
        <>
          <Path d={`M ${pad * 1.2} ${size - pad} V ${size * 0.55}`} stroke={GREEN} strokeWidth={2} strokeLinecap="round" />
          <Path d={`M ${size * 0.5} ${size - pad} V ${size * 0.38}`} stroke={GREEN} strokeWidth={2} strokeLinecap="round" />
          <Path d={`M ${size - pad * 1.2} ${size - pad} V ${size * 0.48}`} stroke={GREEN} strokeWidth={2} strokeLinecap="round" />
        </>
      ) : null}
      {icon === 'users' ? (
        <>
          <Circle cx={size * 0.38} cy={size * 0.4} r={size * 0.12} stroke={GREEN} strokeWidth={1.3} fill="none" />
          <Circle cx={size * 0.62} cy={size * 0.4} r={size * 0.12} stroke={GREEN} strokeWidth={1.3} fill="none" />
          <Path
            d={`M ${pad} ${size * 0.72} Q ${size * 0.38} ${size * 0.58} ${size * 0.5} ${size * 0.58} Q ${size * 0.62} ${size * 0.58} ${size - pad} ${size * 0.72}`}
            stroke={GREEN}
            strokeWidth={1.3}
            fill="none"
          />
        </>
      ) : null}
    </>
  )
}

function createStyles(dim: number) {
  const craftW = dim * 0.28
  return StyleSheet.create({
    root: {
      width: dim,
      height: dim,
      alignItems: 'center',
      justifyContent: 'flex-start',
      alignSelf: 'center',
    },
    glow: {
      position: 'absolute',
      top: dim * 0.16,
      left: dim * 0.14,
      width: dim * 0.72,
      height: dim * 0.72,
      borderRadius: 999,
      backgroundColor: 'rgba(62, 207, 142, 0.18)',
    },
    beamWrap: {
      ...StyleSheet.absoluteFill,
    },
    craft: {
      position: 'absolute',
      top: dim * 0.06,
      left: (dim - (craftW + 24)) / 2,
      alignItems: 'center',
      width: craftW + 24,
      zIndex: 2,
    },
    cubeOuter: {
      width: craftW,
      height: craftW,
      borderRadius: craftW * 0.28,
      backgroundColor: GREEN,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.22)',
      zIndex: 2,
    },
    cubeFace: {
      width: craftW * 0.42,
      height: craftW * 0.42,
      borderRadius: 8,
      backgroundColor: '#ffffff',
      transform: [{ rotate: '12deg' }],
    },
    cubeAccent: {
      position: 'absolute',
      right: craftW * 0.18,
      bottom: craftW * 0.18,
      width: craftW * 0.24,
      height: craftW * 0.24,
      borderRadius: 5,
      backgroundColor: LIME,
    },
    cubeDot: {
      position: 'absolute',
      top: craftW * 0.18,
      left: craftW * 0.18,
      width: craftW * 0.1,
      height: craftW * 0.1,
      borderRadius: 99,
      backgroundColor: LIME,
    },
    saucer: {
      marginTop: -craftW * 0.12,
      width: craftW * 1.35,
      height: craftW * 0.28,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    saucerRing: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: 999,
      backgroundColor: GREEN_MID,
      borderWidth: 1,
      borderColor: 'rgba(197,233,102,0.35)',
    },
    saucerCore: {
      width: '42%',
      height: '46%',
      borderRadius: 999,
      backgroundColor: LIME,
      opacity: 0.85,
    },
  })
}
