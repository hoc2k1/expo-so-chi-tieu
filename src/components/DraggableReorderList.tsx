import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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
  itemCount: number;
  itemHeight: number;
  slotHeight: number;
  activeIndex: SharedValue<number>;
  targetIndex: SharedValue<number>;
  dragY: SharedValue<number>;
  isAnimatingDrop: SharedValue<boolean>;
  onScrollLock: (locked: boolean) => void;
  onDropComplete: (from: number, to: number) => void;
  renderContent: (item: T) => React.ReactNode;
}

function DraggableRow<T extends { id: string }>({
  item,
  index,
  itemCount,
  itemHeight,
  slotHeight,
  activeIndex,
  targetIndex,
  dragY,
  isAnimatingDrop,
  onScrollLock,
  onDropComplete,
  renderContent,
}: DraggableRowProps<T>) {
  const { colors } = useTheme();
  const activeBorder = colors.primary;
  const activeBg = colors.surfaceElevated;
  const idleBorder = colors.border;
  const idleBg = colors.surfaceSecondary;

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(2)
        .shouldCancelWhenOutside(false)
        .onBegin(() => {
          if (isAnimatingDrop.get() || activeIndex.get() !== -1) return;
          runOnJS(onScrollLock)(true);
        })
        .onStart(() => {
          if (isAnimatingDrop.get() || activeIndex.get() !== -1) return;
          activeIndex.set(index);
          targetIndex.set(index);
          dragY.set(0);
        })
        .onUpdate((e) => {
          if (activeIndex.get() !== index) return;
          const minDrag = -index * slotHeight;
          const maxDrag = (itemCount - 1 - index) * slotHeight;
          const clampedY = Math.max(minDrag, Math.min(maxDrag, e.translationY));
          dragY.set(clampedY);

          const rawTarget = Math.round((index * slotHeight + clampedY) / slotHeight);
          const nextTarget = Math.max(0, Math.min(itemCount - 1, rawTarget));
          if (targetIndex.get() !== nextTarget) {
            targetIndex.set(nextTarget);
          }
        })
        .onFinalize(() => {
          if (activeIndex.get() !== index) {
            if (activeIndex.get() === -1 && !isAnimatingDrop.get()) {
              runOnJS(onScrollLock)(false);
            }
            return;
          }

          const from = activeIndex.get();
          const to = targetIndex.get();
          const finalTo = to === -1 ? from : to;
          const targetOffset = (finalTo - from) * slotHeight;

          isAnimatingDrop.set(true);
          dragY.set(
            withTiming(targetOffset, { duration: 160 }, () => {
              'worklet';
              runOnJS(onDropComplete)(from, finalTo);
            })
          );
        }),
    [
      index,
      itemCount,
      slotHeight,
      activeIndex,
      targetIndex,
      dragY,
      isAnimatingDrop,
      onScrollLock,
      onDropComplete,
    ]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const active = activeIndex.value;
    const target = targetIndex.value;
    const baseTop = index * slotHeight;

    // Idle state: snap directly to baseTop without withTiming so item reorder commits cleanly
    if (active === -1) {
      return {
        transform: [{ translateY: baseTop }, { scale: 1 }],
        zIndex: 1,
        elevation: 0,
        borderColor: idleBorder,
        backgroundColor: idleBg,
      };
    }

    if (active === index) {
      return {
        transform: [{ translateY: baseTop + dragY.value }, { scale: 1.02 }],
        zIndex: 100,
        elevation: 8,
        borderColor: activeBorder,
        backgroundColor: activeBg,
      };
    }

    let offset = 0;
    if (target !== -1) {
      if (active < target && index > active && index <= target) {
        offset = -slotHeight;
      } else if (active > target && index >= target && index < active) {
        offset = slotHeight;
      }
    }

    return {
      transform: [
        { translateY: withTiming(baseTop + offset, { duration: 140 }) },
        { scale: 1 },
      ],
      zIndex: 1,
      elevation: 0,
      borderColor: idleBorder,
      backgroundColor: idleBg,
    };
  }, [index, slotHeight, activeBorder, activeBg, idleBorder, idleBg]);

  return (
    <Animated.View
      style={[
        styles.rowContainer,
        {
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

  const pendingResetRef = useRef(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slotHeight = itemHeight + itemGap;
  const totalHeight = items.length > 0 ? items.length * slotHeight - itemGap : 0;

  const resetDragState = useCallback(() => {
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    pendingResetRef.current = false;
    activeIndex.set(-1);
    targetIndex.set(-1);
    dragY.set(0);
    isAnimatingDrop.set(false);
  }, [activeIndex, targetIndex, dragY, isAnimatingDrop]);

  useLayoutEffect(() => {
    if (pendingResetRef.current) {
      resetDragState();
    }
  }, [items, resetDragState]);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const handleScrollLock = useCallback(
    (locked: boolean) => {
      onScrollLockChange?.(locked);
    },
    [onScrollLockChange]
  );

  const handleDropComplete = useCallback(
    (from: number, to: number) => {
      onScrollLockChange?.(false);

      if (
        from >= 0 &&
        to >= 0 &&
        from < items.length &&
        to < items.length &&
        from !== to
      ) {
        // Hold activeIndex/dragY until React commits the reordered items array
        pendingResetRef.current = true;
        resetTimeoutRef.current = setTimeout(resetDragState, 120);

        const next = [...items];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onReorder(next);
      } else {
        resetDragState();
      }
    },
    [items, onReorder, onScrollLockChange, resetDragState]
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
          itemCount={items.length}
          itemHeight={itemHeight}
          slotHeight={slotHeight}
          activeIndex={activeIndex}
          targetIndex={targetIndex}
          dragY={dragY}
          isAnimatingDrop={isAnimatingDrop}
          onScrollLock={handleScrollLock}
          onDropComplete={handleDropComplete}
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
    top: 0,
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
