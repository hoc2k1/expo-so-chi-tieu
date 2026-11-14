import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

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
        borderColor: '#38BDF8',
        backgroundColor: '#1E293B',
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
      borderColor: '#334155',
      backgroundColor: '#0F172A',
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

  const slotHeight = itemHeight + itemGap;
  const totalHeight = items.length > 0 ? items.length * slotHeight - itemGap : 0;

  const handleDragStart = useCallback(
    (index: number) => {
      activeIndex.set(index);
      targetIndex.set(index);
      dragY.set(0);
      onScrollLockChange?.(true);
    },
    [activeIndex, targetIndex, dragY, onScrollLockChange]
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

  const handleDragEnd = useCallback(
    (index: number) => {
      if (activeIndex.get() !== index) return;
      const from = activeIndex.get();
      const to = targetIndex.get();
      activeIndex.set(-1);
      targetIndex.set(-1);
      dragY.set(0);
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
    [activeIndex, targetIndex, dragY, items, onReorder, onScrollLockChange]
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
    borderRadius: 10,
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
