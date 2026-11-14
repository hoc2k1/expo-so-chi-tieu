import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Radius } from '../constants/theme';

interface DraggableReorderListProps<T extends { id: string }> {
  items: T[];
  itemHeight: number;
  itemGap?: number;
  onReorder: (newItems: T[]) => void;
  onScrollLockChange?: (locked: boolean) => void;
  renderContent: (item: T) => React.ReactNode;
}

interface DraggableRowProps<T extends { id: string }> {
  item: T;
  index: number;
  itemHeight: number;
  slotHeight: number;
  activeIndex: SharedValue<number>;
  targetIndex: SharedValue<number>;
  dragY: SharedValue<number>;
  onDragStart: (index: number) => void;
  onDragUpdate: (index: number, translationY: number) => void;
  onDragEnd: (index: number) => void;
  renderContent: (item: T) => React.ReactNode;
}

function DraggableRow<T extends { id: string }>({
  item,
  index,
  itemHeight,
  slotHeight,
  activeIndex,
  targetIndex,
  dragY,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  renderContent,
}: DraggableRowProps<T>) {
  const { colors } = useTheme();
  const activeBorder = colors.primary;
  const activeBg = colors.surfaceElevated;
  const idleBorder = colors.border;
  const idleBg = colors.surfaceSecondary;

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .minDistance(2)
    .onBegin(() => {
      onDragStart(index);
    })
    .onUpdate((e) => {
      onDragUpdate(index, e.translationY);
    })
    .onFinalize(() => {
      onDragEnd(index);
    });

  const animatedStyle = useAnimatedStyle(() => {
    const active = activeIndex.value;
    const target = targetIndex.value;

    if (active === index) {
      return {
        transform: [{ translateY: dragY.value }, { scale: 1.02 }],
        zIndex: 100,
        elevation: 8,
        borderColor: activeBorder,
        backgroundColor: activeBg,
      };
    }

    let offset = 0;
    if (active !== -1 && target !== -1) {
      if (active < target && index > active && index <= target) {
        offset = -slotHeight;
      } else if (active > target && index >= target && index < active) {
        offset = slotHeight;
      }
    }

    return {
      transform: [
        { translateY: withTiming(offset, { duration: 140 }) },
        { scale: 1 },
      ],
      zIndex: 1,
      elevation: 0,
      borderColor: idleBorder,
      backgroundColor: idleBg,
    };
  });

  return (
    <Animated.View
      style={[
        styles.rowContainer,
        {
          top: index * slotHeight,
          height: itemHeight,
        },
        animatedStyle,
      ]}
    >
      <GestureDetector gesture={panGesture}>
        <View style={styles.dragHandle} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Ionicons name="reorder-three" size={22} color="#64748B" />
        </View>
      </GestureDetector>
      <View style={styles.rowBody}>{renderContent(item)}</View>
    </Animated.View>
  );
}

export function DraggableReorderList<T extends { id: string }>({
  items,
  itemHeight,
  itemGap = 8,
  onReorder,
  onScrollLockChange,
  renderContent,
}: DraggableReorderListProps<T>) {
  const activeIndex = useSharedValue(-1);
  const targetIndex = useSharedValue(-1);
  const dragY = useSharedValue(0);
  const isAnimatingDrop = useSharedValue(false);

  const slotHeight = itemHeight + itemGap;
  const totalHeight = items.length > 0 ? items.length * slotHeight - itemGap : 0;

  const handleDragStart = useCallback(
    (index: number) => {
      if (isAnimatingDrop.get()) return;
      activeIndex.set(index);
      targetIndex.set(index);
      dragY.set(0);
      onScrollLockChange?.(true);
    },
    [activeIndex, targetIndex, dragY, isAnimatingDrop, onScrollLockChange]
  );

  const handleDragUpdate = useCallback(
    (index: number, translationY: number) => {
      if (activeIndex.get() !== index) return;
      dragY.set(translationY);
      const rawTarget = Math.round((index * slotHeight + translationY) / slotHeight);
      targetIndex.set(Math.max(0, Math.min(items.length - 1, rawTarget)));
    },
    [activeIndex, targetIndex, dragY, slotHeight, items.length]
  );

  const finalizeDrop = useCallback(
    (from: number, to: number) => {
      activeIndex.set(-1);
      targetIndex.set(-1);
      dragY.set(0);
      isAnimatingDrop.set(false);
      onScrollLockChange?.(false);

      if (
        from >= 0 &&
        to >= 0 &&
        from < items.length &&
        to < items.length &&
        from !== to
      ) {
        const next = [...items];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onReorder(next);
      }
    },
    [activeIndex, targetIndex, dragY, isAnimatingDrop, items, onReorder, onScrollLockChange]
  );

  const handleDragEnd = useCallback(
    (index: number) => {
      if (activeIndex.get() !== index) return;
      const from = activeIndex.get();
      const to = targetIndex.get();
      if (from === -1) return;

      const finalTo = to === -1 ? from : to;
      const targetOffset = (finalTo - from) * slotHeight;

      isAnimatingDrop.set(true);

      dragY.set(
        withTiming(targetOffset, { duration: 180 }, () => {
          'worklet';
          runOnJS(finalizeDrop)(from, finalTo);
        })
      );
    },
    [activeIndex, targetIndex, dragY, isAnimatingDrop, slotHeight, finalizeDrop]
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={[styles.listContainer, { height: totalHeight }]}>
      {items.map((item, index) => (
        <DraggableRow
          key={item.id}
          item={item}
          index={index}
          itemHeight={itemHeight}
          slotHeight={slotHeight}
          activeIndex={activeIndex}
          targetIndex={targetIndex}
          dragY={dragY}
          onDragStart={handleDragStart}
          onDragUpdate={handleDragUpdate}
          onDragEnd={handleDragEnd}
          renderContent={renderContent}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    position: 'relative',
    width: '100%',
  },
  rowContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingRight: 10,
  },
  dragHandle: {
    paddingHorizontal: 10,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
