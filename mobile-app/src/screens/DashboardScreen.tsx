import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../components/Button';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { DashboardData, dashboardService } from '../services/dashboardService';
import { colors } from '../theme/colors';

const moneyFormatter = new Intl.NumberFormat('en-BD', {
  maximumFractionDigits: 2,
});

const formatValue = (value: unknown) => {
  if (typeof value === 'number') return moneyFormatter.format(value);
  if (typeof value === 'string') return value;
  if (value == null) return '0';
  return String(value);
};

const pickStats = (data: DashboardData) => {
  const entries = Object.entries(data).filter(([, value]) => {
    return ['number', 'string'].includes(typeof value) || value == null;
  });

  return entries.slice(0, 8).map(([key, value]) => ({
    label: key.replace(/_/g, ' '),
    value: formatValue(value),
  }));
};

const moduleNames = [
  'Cash Received',
  'Cash Payment',
  'Bank Received',
  'Bank Payment',
  'Journal',
  'Ledger',
  'Cash Book',
  'Stock',
  'Purchase',
  'Sales',
];

export const DashboardScreen = () => {
  const { logout, user } = useAuth();
  const [data, setData] = useState<DashboardData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => pickStats(data), [data]);

  const loadDashboard = async () => {
    setError(null);
    try {
      const result = await dashboardService.getDashboard();
      setData(result);
    } catch (dashboardError) {
      const message =
        dashboardError instanceof Error ? dashboardError.message : 'Dashboard load failed.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl onRefresh={loadDashboard} refreshing={isLoading} />}
    >
      <View style={styles.topbar}>
        <View>
          <Text style={styles.kicker}>CashBookBD</Text>
          <Text numberOfLines={1} style={styles.title}>
            {user?.name || 'Dashboard'}
          </Text>
        </View>
        <Button onPress={logout} title="Logout" variant="ghost" />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.muted}>Loading dashboard</Text>
        </View>
      ) : (
        <>
          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.statsGrid}>
            {stats.length ? (
              stats.map((item) => <StatCard key={item.label} label={item.label} value={item.value} />)
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Dashboard connected</Text>
                <Text style={styles.muted}>No simple summary fields were returned by the API.</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>Modules</Text>
          <View style={styles.moduleGrid}>
            {moduleNames.map((name) => (
              <View key={name} style={styles.moduleItem}>
                <Text numberOfLines={2} style={styles.moduleText}>
                  {name}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flexGrow: 1,
    padding: 18,
    paddingTop: 56,
  },
  topbar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  kicker: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    maxWidth: 210,
  },
  loading: {
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    minHeight: 320,
  },
  muted: {
    color: colors.muted,
    fontSize: 14,
  },
  error: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: 8,
    borderWidth: 1,
    color: colors.danger,
    fontWeight: '700',
    marginBottom: 14,
    padding: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emptyState: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
    width: '100%',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
    marginTop: 26,
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moduleItem: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 68,
    padding: 10,
    width: '31%',
  },
  moduleText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});
