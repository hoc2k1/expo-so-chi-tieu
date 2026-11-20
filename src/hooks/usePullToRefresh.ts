import React, { useCallback, useState } from 'react';
import { Platform, RefreshControl } from 'react-native';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../constants/theme';

export function usePullToRefresh() {
  const { refreshAllData, syncCachedNotifications } = useApp();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAllData();
      if (Platform.OS === 'android') {
        await syncCachedNotifications({ forceRescan: true });
      }
    } finally {
      setRefreshing(false);
      setRefreshKey((k) => k + 1);
    }
  }, [refreshAllData, syncCachedNotifications]);

  const refreshControl = React.createElement(RefreshControl, {
    refreshing,
    onRefresh,
    tintColor: colors.primary,
    colors: [colors.primary],
    progressBackgroundColor: colors.surface,
  });

  return { refreshing, refreshKey, onRefresh, refreshControl };
}
