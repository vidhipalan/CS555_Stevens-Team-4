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
      try {
        if (process.env.EXPO_PUBLIC_FORCE_LOGOUT === '1') {
          await SecureStore.deleteItemAsync('auth_token');
          await SecureStore.deleteItemAsync('user_email');
          await SecureStore.deleteItemAsync('user_role');
          setHasToken(false);
          const inAuthGroupNow = segments[0] === '(auth)';
          if (!inAuthGroupNow) {
            router.replace('/(auth)/login' as any);
          }
          return;
        }

        const token = await SecureStore.getItemAsync('auth_token');
        const userRole = await SecureStore.getItemAsync('user_role');
        console.log('auth_token:', token); 
        const tokenExists = !!token;
        setHasToken(tokenExists);

        const currentSegment = segments[0];
        const inAuthGroup = currentSegment === '(auth)';
        const inTabsGroup = currentSegment === '(tabs)';

        // If no token and not in auth group, redirect to login
        if (!tokenExists) {
          if (!inAuthGroup) {
            router.replace('/(auth)/login' as any);
          }
          return;
        }

        // If token exists, handle routing based on current location
        if (tokenExists) {
          // If in auth group, redirect to appropriate tab
          if (inAuthGroup) {
            if (userRole === 'clinician') {
              router.replace('/(tabs)/dashboard' as any);
            } else {
              router.replace('/(tabs)' as any);
            }
          } 
          // If not in any group or at root, redirect to appropriate tab
          else if (!inTabsGroup && currentSegment !== 'modal') {
            if (userRole === 'clinician') {
              router.replace('/(tabs)/dashboard' as any);
            } else {
              router.replace('/(tabs)' as any);
            }
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        // On error, assume no token and redirect to login
        setHasToken(false);
        const currentSegment = segments[0];
        if (currentSegment !== '(auth)') {
          router.replace('/(auth)/login' as any);
        }
      }
    };

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (hasToken === null) {
        console.warn('Auth check timeout, defaulting to no token');
        setHasToken(false);
        const currentSegment = segments[0];
        if (currentSegment !== '(auth)') {
          router.replace('/(auth)/login' as any);
        }
      }
    }, 3000); // 3 second timeout

    checkAuth();

    return () => clearTimeout(timeoutId);
  }, [segments, router]);

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
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
