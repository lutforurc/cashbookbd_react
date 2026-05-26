import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type StatCardProps = {
  label: string;
  value: string;
};

export const StatCard = ({ label, value }: StatCardProps) => (
  <View style={styles.card}>
    <Text numberOfLines={1} style={styles.label}>
      {label}
    </Text>
    <Text numberOfLines={1} adjustsFontSizeToFit style={styles.value}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '48%',
    gap: 8,
    minHeight: 96,
    padding: 14,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
});
