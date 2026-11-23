import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { formatCurrency } from '../utils/formatters';
import { useTheme, ThemeColors, Radius, Spacing, TouchTarget } from '../constants/theme';

export interface PieSliceItem {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number;
  color: string;
  count: number;
}

interface PieChartSvgProps {
  data: PieSliceItem[];
  totalAmount: number;
  centerLabel: string;
  onPressSlice?: (categoryId: string) => void;
}

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function createPieSlicePath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const effectiveEnd = endAngle - startAngle >= 359.9 ? startAngle + 359.89 : endAngle;

  const startOuter = polarToCartesian(cx, cy, outerRadius, effectiveEnd);
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, effectiveEnd);
  const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);

  const largeArcFlag = effectiveEnd - startAngle <= 180 ? '0' : '1';

  return [
    'M',
    startOuter.x,
    startOuter.y,
    'A',
    outerRadius,
    outerRadius,
    0,
    largeArcFlag,
    0,
    endOuter.x,
    endOuter.y,
    'L',
    endInner.x,
    endInner.y,
    'A',
    innerRadius,
    innerRadius,
    0,
    largeArcFlag,
    1,
    startInner.x,
    startInner.y,
    'Z',
  ].join(' ');
}

export const PieChartSvg: React.FC<PieChartSvgProps> = ({
  data,
  totalAmount,
  centerLabel,
  onPressSlice,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const size = 204;
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = 90;
  const innerRadius = 52;
  const labelRadius = (outerRadius + innerRadius) / 2;

  const slices = data.map((item, idx) => {
    const startAngle = data
      .slice(0, idx)
      .reduce((acc, prev) => acc + (prev.percentage / 100) * 360, 0);
    const sliceAngle = (item.percentage / 100) * 360;
    const endAngle = startAngle + sliceAngle;
    const midAngle = startAngle + sliceAngle / 2;

    const path = createPieSlicePath(cx, cy, innerRadius, outerRadius, startAngle, endAngle);
    const labelPos = polarToCartesian(cx, cy, labelRadius, midAngle);

    return {
      ...item,
      path,
      sliceAngle,
      labelPos,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G>
            {slices.length === 1 ? (
              <>
                <Circle cx={cx} cy={cy} r={outerRadius} fill={slices[0].color} />
                <Circle cx={cx} cy={cy} r={innerRadius} fill={colors.surface} />
                <SvgText
                  x={cx}
                  y={cy - outerRadius + 22}
                  fill="#FFFFFF"
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  100%
                </SvgText>
              </>
            ) : (
              slices.map((s) => (
                <G key={s.categoryId}>
                  <Path
                    d={s.path}
                    fill={s.color}
                    stroke={colors.surface}
                    strokeWidth={2.5}
                    onPress={() => onPressSlice?.(s.categoryId)}
                  />
                  {s.percentage >= 7 && (
                    <SvgText
                      x={s.labelPos.x}
                      y={s.labelPos.y + 4}
                      fill="#FFFFFF"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {`${Math.round(s.percentage)}%`}
                    </SvgText>
                  )}
                </G>
              ))
            )}
          </G>
        </Svg>

        {/* Center Donut Info */}
        <View style={styles.centerBox} pointerEvents="none">
          <Text style={styles.centerTitle}>{centerLabel}</Text>
          <Text style={styles.centerAmount} numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(totalAmount)}
          </Text>
        </View>
      </View>

      {/* Legend with % */}
      <View style={styles.legendContainer}>
        {data.map((item) => (
          <Pressable
            key={item.categoryId}
            style={({ pressed }) => [styles.legendItem, pressed && { opacity: 0.75 }]}
            onPress={() => onPressSlice?.(item.categoryId)}
            accessibilityRole="button"
          >
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendName} numberOfLines={1}>
              {item.categoryName}
            </Text>
            <Text style={styles.legendPercent}>{item.percentage.toFixed(1)}%</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      width: '100%',
      alignItems: 'center',
      gap: Spacing.md,
    },
    chartWrapper: {
      width: 204,
      height: 204,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
    },
    centerBox: {
      position: 'absolute',
      width: 92,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerTitle: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '600',
    },
    centerAmount: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
      marginTop: 2,
      fontVariant: ['tabular-nums'],
    },
    legendContainer: {
      width: '100%',
      gap: Spacing.xs,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs + 2,
      minHeight: TouchTarget.minSize - 8,
      borderRadius: Radius.sm,
      gap: Spacing.xs + 2,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    legendName: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    legendPercent: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
  });
