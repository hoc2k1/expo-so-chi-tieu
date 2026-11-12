import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { G, Path, Circle, Text as SvgText } from 'react-native-svg';
import { formatCurrency } from '../utils/formatters';

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
  // Clamp full circle slightly below 360 so SVG arc doesn't collapse
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
  const size = 210;
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = 92;
  const innerRadius = 50;
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
                <Circle cx={cx} cy={cy} r={innerRadius} fill="#1E293B" />
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
                    stroke="#1E293B"
                    strokeWidth={2}
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
          <Text style={styles.centerAmount} numberOfLines={1}>
            {formatCurrency(totalAmount)}
          </Text>
        </View>
      </View>

      {/* Legend with % */}
      <View style={styles.legendContainer}>
        {data.map((item) => (
          <TouchableOpacity
            key={item.categoryId}
            style={styles.legendItem}
            onPress={() => onPressSlice?.(item.categoryId)}
          >
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendName} numberOfLines={1}>
              {item.categoryName}
            </Text>
            <Text style={styles.legendPercent}>{item.percentage.toFixed(1)}%</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  chartWrapper: {
    width: 210,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  centerBox: {
    position: 'absolute',
    width: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  centerAmount: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  legendContainer: {
    flex: 1,
    minWidth: 140,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  legendPercent: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
});
