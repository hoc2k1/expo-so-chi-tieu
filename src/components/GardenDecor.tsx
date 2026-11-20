import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import { Radius, Shadows, useTheme } from '../constants/theme';

const SPROUT_TOP_SOURCE = require('../../assets/lottie/json/sprout_top.json');
const GRASS_LEFT_SOURCE = require('../../assets/lottie/json/grass-left.json');
const GRASS_RIGHT_SOURCE = require('../../assets/lottie/json/grass-right.json');

export type GardenVariant = 'input' | 'card' | 'modal' | 'minimal' | 'chip';

interface GardenSproutsProps {
  /** Preset layout for grass/sprout clusters on borders */
  variant?: GardenVariant;
  /** Optional placement for compact 'chip' variant (default 'right') */
  align?: 'left' | 'right' | 'both';
}

/**
 * Nature UI animated Lottie grass & daisy tufts peeking out along borders.
 * Always pointerEvents="none" and relies on parent having overflow: 'visible'.
 */
export const GardenSprouts: React.FC<GardenSproutsProps> = ({
  variant = 'card',
  align = 'right',
}) => {
  const { isDark } = useTheme();
  const lottieOpacity = isDark ? 0.88 : 1;

  if (variant === 'chip') {
    return (
      <View style={[StyleSheet.absoluteFill, styles.layer, { opacity: lottieOpacity }]} pointerEvents="none">
        {(align === 'left' || align === 'both') && (
          <View style={styles.chipTopLeft}>
            <LottieView
              source={SPROUT_TOP_SOURCE}
              autoPlay
              loop
              speed={0.9}
              style={styles.chipSproutSize}
            />
          </View>
        )}
        {(align === 'right' || align === 'both') && (
          <View style={styles.chipTopRight}>
            <LottieView
              source={align === 'both' ? GRASS_RIGHT_SOURCE : SPROUT_TOP_SOURCE}
              autoPlay
              loop
              speed={0.85}
              style={align === 'both' ? styles.chipRightGrassSize : styles.chipSproutSize}
            />
          </View>
        )}
      </View>
    );
  }

  if (variant === 'modal') {
    return (
      <View style={[StyleSheet.absoluteFill, styles.layer, { opacity: lottieOpacity }]} pointerEvents="none">
        {/* Top-left large grass + white daisy */}
        <View style={styles.modalTopLeftGrass}>
          <LottieView
            source={GRASS_LEFT_SOURCE}
            autoPlay
            loop
            speed={0.85}
            style={styles.grassLeftSize}
          />
        </View>

        {/* Top-center small sprout */}
        <View style={styles.modalTopCenterSprout}>
          <LottieView
            source={SPROUT_TOP_SOURCE}
            autoPlay
            loop
            speed={0.95}
            style={styles.sproutTopSize}
          />
        </View>

        {/* Top-right small grass + white daisy */}
        <View style={styles.modalTopRightGrass}>
          <LottieView
            source={GRASS_RIGHT_SOURCE}
            autoPlay
            loop
            speed={0.9}
            style={styles.grassRightSize}
          />
        </View>
      </View>
    );
  }

  if (variant === 'minimal') {
    return (
      <View style={[StyleSheet.absoluteFill, styles.layer, { opacity: lottieOpacity }]} pointerEvents="none">
        <View style={styles.topLeftSprout}>
          <LottieView
            source={SPROUT_TOP_SOURCE}
            autoPlay
            loop
            speed={0.9}
            style={styles.sproutTopSmallSize}
          />
        </View>
        <View style={styles.topRightGrass}>
          <LottieView
            source={GRASS_RIGHT_SOURCE}
            autoPlay
            loop
            speed={0.85}
            style={styles.grassRightSmallSize}
          />
        </View>
      </View>
    );
  }

  // 'card' and 'input' variants: top sprout + bottom-left big grass + right grass/daisy
  return (
    <View style={[StyleSheet.absoluteFill, styles.layer, { opacity: lottieOpacity }]} pointerEvents="none">
      {/* Top border sprout */}
      <View style={variant === 'input' ? styles.inputTopLeftSprout : styles.topLeftSprout}>
        <LottieView
          source={SPROUT_TOP_SOURCE}
          autoPlay
          loop
          speed={0.95}
          style={variant === 'input' ? styles.sproutTopSmallSize : styles.sproutTopSize}
        />
      </View>

      {/* Top-right grass tuft on cards so cards always have grass on top too */}
      {variant === 'card' && (
        <View style={styles.topRightGrass}>
          <LottieView
            source={GRASS_RIGHT_SOURCE}
            autoPlay
            loop
            speed={0.88}
            style={styles.grassRightSmallSize}
          />
        </View>
      )}

      {/* Bottom-left large grass + white daisy */}
      <View style={styles.bottomLeftGrass}>
        <LottieView
          source={GRASS_LEFT_SOURCE}
          autoPlay
          loop
          speed={0.85}
          style={variant === 'input' ? styles.grassLeftSmallSize : styles.grassLeftSize}
        />
      </View>

      {/* Bottom-right small grass + white daisy */}
      <View style={styles.bottomRightGrass}>
        <LottieView
          source={GRASS_RIGHT_SOURCE}
          autoPlay
          loop
          speed={0.92}
          style={variant === 'input' ? styles.grassRightSmallSize : styles.grassRightSize}
        />
      </View>
    </View>
  );
};

interface GardenBoxProps {
  children: React.ReactNode;
  variant?: GardenVariant;
  align?: 'left' | 'right' | 'both';
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Minimalist Nature UI container: cream/surface fill, leaf-green border,
 * soft shadow, and animated Lottie grass/sprout clusters on the border.
 */
export const GardenBox: React.FC<GardenBoxProps> = ({
  children,
  variant = 'card',
  align,
  style,
  contentStyle,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.outerWrap, style]}>
      <View
        style={[
          styles.box,
          {
            backgroundColor: variant === 'input' ? colors.surface : colors.heroBackground,
            borderColor: isDark ? colors.heroBorder : '#A8CC83',
            borderRadius: variant === 'input' ? Radius.xxl : Radius.xl,
          },
          Shadows.card,
          contentStyle,
        ]}
      >
        {children}
      </View>
      <GardenSprouts variant={variant} align={align} />
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrap: {
    position: 'relative',
    overflow: 'visible',
  },
  box: {
    borderWidth: 1.5,
  },
  layer: {
    overflow: 'visible',
    zIndex: 10,
  },
  // Lottie intrinsic aspect ratios:
  // sprout_top: 120x70 (1.71), grass-left: 160x140 (1.14), grass-right: 150x80 (1.875)
  sproutTopSize: {
    width: 44,
    height: 26,
  },
  sproutTopSmallSize: {
    width: 36,
    height: 21,
  },
  grassLeftSize: {
    width: 46,
    height: 40,
  },
  grassLeftSmallSize: {
    width: 38,
    height: 33,
  },
  grassRightSize: {
    width: 48,
    height: 26,
  },
  grassRightSmallSize: {
    width: 40,
    height: 21,
  },
  chipSproutSize: {
    width: 26,
    height: 15,
  },
  chipRightGrassSize: {
    width: 30,
    height: 16,
  },

  // Positions
  topLeftSprout: {
    position: 'absolute',
    top: -22,
    left: 18,
  },
  inputTopLeftSprout: {
    position: 'absolute',
    top: -18,
    left: 18,
  },
  topRightGrass: {
    position: 'absolute',
    top: -18,
    right: 14,
  },
  bottomLeftGrass: {
    position: 'absolute',
    bottom: -4,
    left: -8,
  },
  bottomRightGrass: {
    position: 'absolute',
    bottom: -3,
    right: 14,
  },

  // Modal / Bottom-sheet top-border lush arrangement
  modalTopLeftGrass: {
    position: 'absolute',
    top: -36,
    left: 10,
  },
  modalTopCenterSprout: {
    position: 'absolute',
    top: -22,
    left: '44%',
  },
  modalTopRightGrass: {
    position: 'absolute',
    top: -22,
    right: 12,
  },

  // Compact chip / filter / button top-border sprouts
  chipTopLeft: {
    position: 'absolute',
    top: -13,
    left: 10,
  },
  chipTopRight: {
    position: 'absolute',
    top: -13,
    right: 10,
  },
});
