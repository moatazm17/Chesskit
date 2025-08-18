import React from 'react';
import { StyleSheet, View, ActivityIndicator, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const URL = 'https://chesskit-production.up.railway.app';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top']}> 
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <WebView
          source={{ uri: URL }}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loading}><ActivityIndicator size="large" color="#4CAF50" /></View>
          )}
          injectedJavaScriptBeforeContentLoaded={`
            (function() {
              var head=document.head||document.getElementsByTagName('head')[0];
              var meta=document.querySelector('meta[name="viewport"]')||document.createElement('meta');
              meta.setAttribute('name','viewport');
              meta.setAttribute('content','width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
              if(!meta.parentNode) head.appendChild(meta);
              document.addEventListener('gesturestart', function(e){ e.preventDefault(); }, {passive:false});
              document.addEventListener('touchstart', function(e){ if (e.touches.length > 1) e.preventDefault(); }, {passive:false});
            })(); true;
          `}
          contentInsetAdjustmentBehavior="never"
          bounces={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  webview: { flex: 1, backgroundColor: '#1a1a2e' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a2e' },
});