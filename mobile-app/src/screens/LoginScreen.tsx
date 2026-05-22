import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { API_REMOTE_URL } from '../config/api';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

export const LoginScreen = () => {
  const { error, isSubmitting, login } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async () => {
    if (!loginId.trim() || !password) {
      setLocalError('Email/mobile and password are required.');
      return;
    }

    setLocalError(null);

    try {
      await login(loginId.trim(), password);
    } catch {
      // The context exposes the readable error.
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>CB</Text>
        </View>
        <Text style={styles.title}>CashBookBD</Text>
        <Text style={styles.subtitle}>Sign in to your account workspace</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email or mobile</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setLoginId}
          placeholder="name@example.com"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={loginId}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {(localError || error) && <Text style={styles.error}>{localError || error}</Text>}

        <Button loading={isSubmitting} onPress={submit} title="Sign in" />
      </View>

      <Text numberOfLines={1} style={styles.apiHost}>
        API: {API_REMOTE_URL}
      </Text>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    height: 56,
    justifyContent: 'center',
    marginBottom: 14,
    width: 56,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 6,
  },
  form: {
    gap: 10,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
    marginVertical: 4,
  },
  apiHost: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 28,
    textAlign: 'center',
  },
});
