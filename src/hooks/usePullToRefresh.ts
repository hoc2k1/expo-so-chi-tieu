import React, { useCallback, useState } from 'react';
import { Platform, RefreshControl } from 'react-native';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../constants/theme';

export function usePullToRefresh() {
  const { refreshAllData, syncCachedNotifications } = useApp();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAllData();
      if (Platform.OS === 'android') {
        await syncCachedNotifications({ forceRescan: true });
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshAllData, syncCachedNotifications]);

  const refreshControl = React.createElement(RefreshControl, {
    refreshing,
    onRefresh,
    tintColor: colors.primary,
    colors: [colors.primary],
    progressBackgroundColor: colors.surface,
  });

  return { refreshing, onRefresh, refreshControl };
}
