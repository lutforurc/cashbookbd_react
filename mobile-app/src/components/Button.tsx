import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
};

export const Button = ({ title, onPress, loading, variant = 'primary' }: ButtonProps) => {
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isGhost ? styles.ghostButton : styles.primaryButton,
        pressed && styles.pressed,
        loading && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isGhost ? colors.primary : '#ffffff'} />
      ) : (
        <Text style={[styles.title, isGhost ? styles.ghostTitle : styles.primaryTitle]}>{title}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  ghostButton: {
    backgroundColor: colors.surfaceMuted,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.7,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryTitle: {
    color: '#ffffff',
  },
  ghostTitle: {
    color: colors.primaryDark,
  },
});
