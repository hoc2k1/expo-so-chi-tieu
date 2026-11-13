import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
} from 'react-native';

export interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  /** Offset from the top of the screen (e.g. navigation header height on iOS). */
  keyboardVerticalOffset?: number;
}

export type KeyboardAwareScrollViewRef = React.ComponentRef<typeof ScrollView>;

/**
 * ScrollView wrapped in KeyboardAvoidingView so bottom TextInputs remain visible
 * above the soft keyboard on both iOS and Android (including edge-to-edge).
 */
export const KeyboardAwareScrollView = React.forwardRef<
  KeyboardAwareScrollViewRef,
  KeyboardAwareScrollViewProps
>(function KeyboardAwareScrollView(
  {
    keyboardVerticalOffset = Platform.OS === 'ios' ? 64 : 0,
    keyboardShouldPersistTaps = 'handled',
    keyboardDismissMode = 'on-drag',
    style,
    children,
    ...scrollProps
  },
  ref
) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        ref={ref}
        style={[styles.flex, style]}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode={keyboardDismissMode}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
