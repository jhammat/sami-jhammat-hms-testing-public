import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import * as SecureStore from "expo-secure-store";

const STORE_KEY = "wonflow_doctor_server_url";
const DEFAULT_FALLBACK_URL = "http://192.168.100.10:3000";

export default function DoctorPortalWrapper() {
  const webViewRef = useRef<WebView>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState(DEFAULT_FALLBACK_URL);
  const [showSettings, setShowSettings] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Load saved server URL on startup
  useEffect(() => {
    async function loadSavedUrl() {
      try {
        const saved = await SecureStore.getItemAsync(STORE_KEY);
        const urlToUse =
          saved?.trim() ||
          process.env.EXPO_PUBLIC_WONFLOW_APP_URL?.trim() ||
          DEFAULT_FALLBACK_URL;
        setServerUrl(urlToUse);
        setEditingUrl(urlToUse);
      } catch {
        setServerUrl(DEFAULT_FALLBACK_URL);
        setEditingUrl(DEFAULT_FALLBACK_URL);
      }
    }
    void loadSavedUrl();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  const handleSaveUrl = async () => {
    let clean = editingUrl.trim().replace(/\/+$/, "");
    if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
      clean = `http://${clean}`;
    }
    try {
      await SecureStore.setItemAsync(STORE_KEY, clean);
    } catch {
      // SecureStore fallback
    }
    setServerUrl(clean);
    setShowSettings(false);
    setLoadFailed(false);
    setLoading(true);
    setReloadKey((c) => c + 1);
  };

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  }, []);

  const handleShouldStartLoad = useCallback(
    (request: { url: string }) => {
      if (!serverUrl) return true;
      const origin = serverUrl.replace(/\/+$/, "");
      if (
        request.url.startsWith(origin) ||
        request.url.startsWith("about:") ||
        request.url.startsWith("data:") ||
        request.url.startsWith("blob:")
      ) {
        return true;
      }
      void Linking.openURL(request.url);
      return false;
    },
    [serverUrl],
  );

  const retry = useCallback(() => {
    setLoadFailed(false);
    setLoading(true);
    setReloadKey((current) => current + 1);
  }, []);

  if (!serverUrl || showSettings) {
    return (
      <SafeAreaView style={styles.settingsContainer}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.settingsCard}
        >
          <Text style={styles.settingsTitle}>WonFlow Doctor Portal</Text>
          <Text style={styles.settingsSubtitle}>
            Configure your hospital server URL to connect this iPhone to your workspace.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Hospital Server URL</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setEditingUrl}
              placeholder="e.g. http://192.168.100.10:3000"
              placeholderTextColor="#94a3b8"
              style={styles.urlInput}
              value={editingUrl}
            />
          </View>

          {/* Quick presets */}
          <View style={styles.presets}>
            <TouchableOpacity
              onPress={() => setEditingUrl("http://192.168.100.10:3000")}
              style={styles.presetButton}
            >
              <Text style={styles.presetText}>Local Wi-Fi (192.168.100.10)</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity activeOpacity={0.8} onPress={handleSaveUrl} style={styles.connectButton}>
            <Text style={styles.connectText}>Connect to Hospital</Text>
          </TouchableOpacity>

          {serverUrl ? (
            <TouchableOpacity onPress={() => setShowSettings(false)} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Back to Portal</Text>
            </TouchableOpacity>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const doctorTargetUrl = serverUrl.endsWith("/doctor")
    ? serverUrl
    : `${serverUrl.replace(/\/+$/, "")}/doctor`;

  if (loadFailed) {
    return (
      <SafeAreaView style={styles.center}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorCard}>
          <Text style={styles.title}>Doctor Workspace Offline</Text>
          <Text style={styles.body}>
            Unable to connect to:{"\n"}
            <Text style={{ fontWeight: "700", color: "#4f46e5" }}>{serverUrl}</Text>
            {"\n\n"}
            Check your Wi-Fi or update your server address.
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity activeOpacity={0.8} onPress={retry} style={styles.retryButton}>
              <Text style={styles.retryText}>Reconnect</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowSettings(true)}
              style={styles.changeUrlButton}
            >
              <Text style={styles.changeUrlText}>Change URL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <StatusBar barStyle="light-content" />
      <WebView
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        applicationNameForUserAgent="WonFlowDoctorApp/1.0"
        cacheEnabled
        domStorageEnabled
        javaScriptEnabled
        key={reloadKey}
        mediaCapturePermissionGrantType="grant"
        mediaPlaybackRequiresUserAction={false}
        onError={() => setLoadFailed(true)}
        onHttpError={(event) => {
          if (event.nativeEvent.statusCode >= 500) setLoadFailed(true);
        }}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        pullToRefreshEnabled
        ref={webViewRef}
        sharedCookiesEnabled
        source={{
          uri: doctorTargetUrl,
          headers: {
            "Bypass-Tunnel-Reminder": "true",
          },
        }}
        style={styles.flex}
        thirdPartyCookiesEnabled
      />
      {loading ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator color="#4f46e5" size="large" />
          <Text style={styles.loadingText}>Connecting to Doctor Portal…</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: "#090d16",
  },
  settingsContainer: {
    flex: 1,
    backgroundColor: "#090d16",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  settingsCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#1e1b4b",
    borderRadius: 28,
    padding: 26,
    borderWidth: 1,
    borderColor: "#3730a3",
  },
  settingsTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
  },
  settingsSubtitle: {
    fontSize: 13,
    color: "#c7d2fe",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 24,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#e0e7ff",
    marginBottom: 6,
  },
  urlInput: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#4338ca",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  presets: {
    marginBottom: 20,
    gap: 8,
  },
  presetButton: {
    backgroundColor: "#312e81",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  presetText: {
    color: "#a5b4fc",
    fontSize: 11,
    fontWeight: "700",
  },
  connectButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  connectText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  cancelButton: {
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  cancelText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#090d16",
    padding: 24,
  },
  errorCard: {
    backgroundColor: "#1e1b4b",
    padding: 28,
    borderRadius: 24,
    alignItems: "center",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: "#3730a3",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
  },
  body: {
    textAlign: "center",
    color: "#c7d2fe",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  changeUrlButton: {
    backgroundColor: "#312e81",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  changeUrlText: {
    color: "#e0e7ff",
    fontWeight: "700",
    fontSize: 13,
  },
  loadingOverlay: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#090d16",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#a5b4fc",
  },
});
