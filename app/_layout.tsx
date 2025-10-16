import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme?.() ?? 'light';
  const [hasToken, setHasToken] = useState<null | boolean>(null);
  const segments = useSegments();
  const router = useRouter();
  const forceLogout = process.env.EXPO_PUBLIC_FORCE_LOGOUT === '1';

  useEffect(() => {
    const checkAuth = async () => {
      if (process.env.EXPO_PUBLIC_FORCE_LOGOUT === '1') {
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('user_email');
        setHasToken(false);
        const inAuthGroupNow = segments[0] === '(auth)';
        if (!inAuthGroupNow) router.replace('/(auth)/login');
        return;
      }

      const token = await SecureStore.getItemAsync('auth_token');
      console.log('auth_token:', token); 
      const tokenExists = !!token;
      setHasToken(tokenExists);

      const inAuthGroup = segments[0] === '(auth)';

      if (!tokenExists && !inAuthGroup) {
        router.replace('/(auth)/login');
      } else if (tokenExists && inAuthGroup) {
        router.replace('/(tabs)');
      }
    };

    checkAuth();
  }, [segments]);

  if (!forceLogout && hasToken === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {(forceLogout ? false : hasToken) ? (
          <>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="(auth)/login" />
            <Stack.Screen name="(auth)/signup" />
          </>
        )}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
