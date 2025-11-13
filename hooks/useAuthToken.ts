import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

/**
 * Custom hook to manage authentication token
 * Extracted from God Component to separate token management concern
 */
export function useAuthToken() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('auth_token');
      setToken(storedToken);
    } catch (error) {
      console.error('Error loading token:', error);
      router.replace('/(auth)/login' as any);
    } finally {
      setLoading(false);
    }
  };

  return { token, loading, reloadToken: loadToken };
}

