import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export type ChibiMood = 'happy' | 'chill' | 'curious';

interface ChibiStrawberryProps {
  size?: number;
  mood?: ChibiMood;
  animate?: boolean;
  style?: StyleProp<ViewStyle>;
}

const OUTLINE = '#6E443B';
const BODY = '#FF827E';
const BODY_SHADE = '#F56E6C';
const LEAF = '#A7CE99';
const LEAF_DARK = '#8CB87D';
const CHEEK = '#FFB0BA';
const SEED = '#FCE5A2';
const COIN = '#FFE08A';
const COIN_RIM = '#F3C15A';

/**
 * Cute hand-drawn Chibi Strawberry Mascot SVG with gentle floating/breathing motion.
 * Matches the app icon character design.
 */
export const ChibiStrawberry: React.FC<ChibiStrawberryProps> = ({
  size = 84,
  mood = 'happy',
  animate = true,
  style,
}) => {
  const floatY = useSharedValue(0);
  const breathe = useSharedValue(1);

  useEffect(() => {
    if (!animate) return;
    floatY.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [animate, breathe, floatY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { scale: breathe.value }],
  }));

  return (
    <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, animatedStyle, style]}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {/* Soft ground shadow */}
        <Ellipse cx="60" cy="109" rx="26" ry="5" fill="#6E443B" opacity={0.12} />

        {/* Little cute stubby feet */}
        <Path
          d="M44 96 C43 105, 51 107, 54 99"
          fill={BODY_SHADE}
          stroke={OUTLINE}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M76 96 C77 105, 69 107, 66 99"
          fill={BODY_SHADE}
          stroke={OUTLINE}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Plump chibi strawberry body */}
        <Path
          d="M60 32 C34 32, 22 48, 25 71 C28 91, 44 101, 60 101 C76 101, 92 91, 95 71 C98 48, 86 32, 60 32 Z"
          fill={BODY}
          stroke={OUTLINE}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Soft cream seeds */}
        <Ellipse cx="35" cy="52" rx="2.1" ry="3.2" transform="rotate(-12 35 52)" fill={SEED} />
        <Ellipse cx="31" cy="64" rx="1.9" ry="2.8" transform="rotate(-6 31 64)" fill={SEED} />
        <Ellipse cx="42" cy="46" rx="1.8" ry="2.6" transform="rotate(-18 42 46)" fill={SEED} />
        <Ellipse cx="85" cy="52" rx="2.1" ry="3.2" transform="rotate(12 85 52)" fill={SEED} />
        <Ellipse cx="89" cy="64" rx="1.9" ry="2.8" transform="rotate(6 89 64)" fill={SEED} />

        {/* Leafy green stem hat */}
        <Path
          d="M57 26 C55 18, 51 14, 55 12 C59 10, 61 17, 61 24 C67 19, 77 20, 82 25 C86 24, 90 28, 85 33 C79 38, 72 36, 68 35 C66 43, 57 44, 52 36 C46 41, 35 41, 31 35 C27 30, 34 25, 42 26 C46 21, 52 21, 57 26 Z"
          fill={LEAF}
          stroke={OUTLINE}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <Path
          d="M58 29 C60 33, 61 36, 62 39"
          stroke={LEAF_DARK}
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Rosy cheeks */}
        <Ellipse cx="41" cy="68" rx="6" ry="3.4" fill={CHEEK} opacity={0.85} />
        <Ellipse cx="79" cy="68" rx="6" ry="3.4" fill={CHEEK} opacity={0.85} />

        {/* Eyes & Smile by mood */}
        {mood === 'chill' ? (
          <G>
            {/* Happy closed curved eyes */}
            <Path
              d="M42 60 Q47 54 52 60"
              stroke={OUTLINE}
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
            <Path
              d="M68 60 Q73 54 78 60"
              stroke={OUTLINE}
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
            />
            {/* Cozy tiny smile */}
            <Path
              d="M56 64 Q60 68 64 64"
              stroke={OUTLINE}
              strokeWidth="2.8"
              strokeLinecap="round"
              fill="none"
            />
            {/* Tiny floating heart/sparkle */}
            <Path
              d="M96 36 C96 33, 100 32, 101 35 C102 32, 106 33, 106 36 C106 39, 101 42, 101 42 C101 42, 96 39, 96 36 Z"
              fill="#FF9EB5"
            />
          </G>
        ) : (
          <G>
            {/* Sparkling kawaii eyes */}
            <Circle cx="48" cy="59" r="5.2" fill={OUTLINE} />
            <Circle cx="46.5" cy="57.2" r="2" fill="#FFFFFF" />
            <Circle cx="50" cy="60.5" r="0.9" fill="#FFFFFF" />

            <Circle cx="72" cy="59" r="5.2" fill={OUTLINE} />
            <Circle cx="70.5" cy="57.2" r="2" fill="#FFFFFF" />
            <Circle cx="74" cy="60.5" r="0.9" fill="#FFFFFF" />

            {/* Cute smile */}
            {mood === 'curious' ? (
              <Circle cx="60" cy="65" r="2.6" fill={OUTLINE} />
            ) : (
              <Path
                d="M56 63 Q60 68 64 63"
                stroke={OUTLINE}
                strokeWidth="2.8"
                strokeLinecap="round"
                fill="none"
              />
            )}
          </G>
        )}

        {/* Golden coin hugged by tiny arms (happy) or tiny tea cup (chill) */}
        {mood === 'happy' && (
          <G>
            <Circle cx="62" cy="83" r="13" fill={COIN_RIM} stroke={OUTLINE} strokeWidth="2.8" />
            <Circle cx="60.5" cy="82.5" r="10.5" fill={COIN} stroke={OUTLINE} strokeWidth="2" />
            {/* Tiny arms hugging coin */}
            <Path
              d="M42 78 C49 77, 54 81, 51 85 C48 88, 43 86, 40 84"
              fill={BODY}
              stroke={OUTLINE}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M78 78 C71 77, 67 81, 70 85 C73 88, 77 86, 80 84"
              fill={BODY}
              stroke={OUTLINE}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>
        )}

        {mood === 'chill' && (
          <G>
            {/* Cute pastel tea cup */}
            <Path
              d="M51 77 H69 V86 C69 91, 65 94, 60 94 C55 94, 51 91, 51 86 Z"
              fill="#FFFDFD"
              stroke={OUTLINE}
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
            <Path
              d="M69 80 C74 80, 74 87, 69 87"
              fill="none"
              stroke={OUTLINE}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <Path
              d="M43 79 C48 79, 52 81, 51 85 C49 87, 45 86, 42 84"
              fill={BODY}
              stroke={OUTLINE}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </G>
        )}

        {mood === 'curious' && (
          <G>
            {/* Tiny sparkle stars */}
            <Path
              d="M95 38 L97 43 L102 45 L97 47 L95 52 L93 47 L88 45 L93 43 Z"
              fill={COIN}
            />
            <Path
              d="M44 79 C48 83, 52 83, 54 79"
              fill={BODY}
              stroke={OUTLINE}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <Path
              d="M76 79 C72 83, 68 83, 66 79"
              fill={BODY}
              stroke={OUTLINE}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </G>
        )}
      </Svg>
    </Animated.View>
  );
};
