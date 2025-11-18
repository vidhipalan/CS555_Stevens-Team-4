import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const redirect = async () => {
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        const userRole = await SecureStore.getItemAsync('user_role');
        
        if (token) {
          if (userRole === 'clinician') {
            router.replace('/(tabs)/dashboard' as any);
          } else {
            router.replace('/(tabs)' as any);
          }
        } else {
          router.replace('/(auth)/login' as any);
        }
      } catch (error) {
        router.replace('/(auth)/login' as any);
      }
    };
    
    redirect();
  }, [router]);

  // Show loading while redirecting
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
