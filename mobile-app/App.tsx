import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://app.cashbookbd.com';

export default function App() {
  const webViewRef = useRef<WebViewType>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const reload = () => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {Platform.OS === 'web' ? (
        <iframe src={WEB_URL} style={webStyles.iframe} title="CashBookBD" />
      ) : hasError ? (
        <View style={styles.errorView}>
          <Text style={styles.errorTitle}>Site load failed</Text>
          <Text style={styles.errorText}>{WEB_URL}</Text>
          <TouchableOpacity onPress={reload} style={styles.button}>
            <Text style={styles.buttonText}>Reload</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <WebView
            ref={webViewRef}
            source={{ uri: WEB_URL }}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            startInLoadingState
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            onHttpError={() => {
              setIsLoading(false);
            }}
            style={styles.webView}
          />

          {isLoading && (
            <View style={styles.loader}>
              <ActivityIndicator color="#0f766e" size="large" />
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loader: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  errorView: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#10201d',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
  },
  errorText: {
    color: '#687773',
    fontSize: 14,
    marginBottom: 18,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});

const webStyles = {
  iframe: {
    border: 0,
    flex: 1,
    height: '100vh',
    width: '100vw',
  },
} as const;
