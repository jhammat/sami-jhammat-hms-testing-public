import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Linking, Platform, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";

/**
 * The whole product, wrapped: this app has no screens of its own — it's a
 * thin native shell around the real WonFlow web app, which already handles
 * login, role routing, and every portal (admin, reception, doctor, patient,
 * lab, radiology, pharmacy, billing, management, platform). One app covers
 * every role, the same way visiting the website does.
 *
 * Set EXPO_PUBLIC_WONFLOW_APP_URL at build time to point this at a real
 * deployment. The localhost fallback below is for local development only —
 * an Android emulator reaches the host machine at 10.0.2.2, not localhost.
 */
const DEFAULT_DEV_URL = Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";
const APP_URL = process.env.EXPO_PUBLIC_WONFLOW_APP_URL ?? DEFAULT_DEV_URL;

export default function Home() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

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

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
  }, []);

  const handleShouldStartLoad = useCallback((request: { url: string }) => {
    // Keep navigation inside the app for the WonFlow origin itself; anything
    // else (a mailto: link, an external reference) opens in the system
    // browser instead of inside this WebView.
    if (request.url.startsWith(APP_URL) || request.url.startsWith("about:") || request.url.startsWith("data:")) return true;
    void Linking.openURL(request.url);
    return false;
  }, []);

  const retry = useCallback(() => {
    setLoadFailed(false);
    setLoading(true);
    setReloadKey((current) => current + 1);
  }, []);

  if (loadFailed) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Couldn&apos;t reach WonFlow</Text>
        <Text style={styles.body}>Check your internet connection, then try again.</Text>
        <Text onPress={retry} style={styles.retry}>
          Try again
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <WebView
        allowsBackForwardNavigationGestures
        key={reloadKey}
        mediaPlaybackRequiresUserAction={false}
        onError={() => setLoadFailed(true)}
        onHttpError={(event) => { if (event.nativeEvent.statusCode >= 500) setLoadFailed(true); }}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        // Auto-grant camera/microphone access for video consultations
        // instead of WebKit's default repeated prompting (iOS 15+; Android
        // grants automatically based on the app's own CAMERA/RECORD_AUDIO
        // manifest permissions, declared in app.json).
        mediaCapturePermissionGrantType="grant"
        ref={webViewRef}
        sharedCookiesEnabled
        source={{ uri: APP_URL }}
        style={styles.flex}
        thirdPartyCookiesEnabled
      />
      {loading ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator color="#4f46e5" size="large" />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  title: { fontSize: 20, fontWeight: "700" },
  body: { textAlign: "center", color: "#475569" },
  retry: { marginTop: 12, color: "#4f46e5", fontWeight: "700" },
  loadingOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff" },
});
