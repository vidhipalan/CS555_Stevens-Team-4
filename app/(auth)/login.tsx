// app/(auth)/login.tsx
import { API_ENDPOINTS } from '@/constants/config';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Min 6 characters'),
});
type FormValues = z.infer<typeof schema>;

export default function Login() {
  // secure state removed - secureTextEntry disabled for demo screen recording
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, setValue, handleSubmit, formState: { errors, isSubmitting, isValid } } =
    useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onChange' });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const controller = new AbortController();
      const t = setTimeout(() => {
        console.warn('Request timeout - aborting');
        controller.abort();
      }, 15000); // Increased to 15 seconds
      
      console.log('🔍 DEBUG - Login attempt:');
      console.log('   API_URL:', API_ENDPOINTS.AUTH.LOGIN);
      console.log('   EXPO_PUBLIC_API_URL env:', process.env.EXPO_PUBLIC_API_URL || 'NOT SET - using localhost');
      console.log('   Request body:', { email: values.email, password: '***' });
      
      let response;
      try {
        response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
        signal: controller.signal,
      });
      clearTimeout(t);
      } catch (fetchError: any) {
        clearTimeout(t);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout. Please check your network connection and ensure the backend server is running.');
        }
        throw fetchError;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();


      // Save token, email, and role
      await SecureStore.setItemAsync('auth_token', data.token);
      await SecureStore.setItemAsync('user_email', values.email);
      await SecureStore.setItemAsync('user_role', data.user.role);

      // Route based on role
      if (data.user.role === 'clinician') {
        router.replace('/(tabs)/dashboard' as any);
      } else {
        router.replace('/(tabs)' as any);
      }
    } catch (e: any) {
      console.error('Login error:', e);
      console.error('Error name:', e?.name);
      console.error('Error message:', e?.message);
      
      const currentUrl = API_ENDPOINTS.AUTH.LOGIN;
      const isLocalhost = currentUrl.includes('localhost');
      
      if (e?.name === 'AbortError' || e?.message?.includes('Aborted')) {
        let errorMsg = `Request timeout!\n\nTrying to connect to:\n${currentUrl}\n\n`;
        if (isLocalhost) {
          errorMsg += `⚠️ You're using localhost, which won't work on a physical device!\n\n`;
          errorMsg += `To fix:\n1. Stop Expo (Ctrl+C)\n2. Run: EXPO_PUBLIC_API_URL="http://10.214.87.72:5050" npx expo start -c\n3. Or update your IP if different\n\n`;
        }
        errorMsg += `Check:\n• Backend is running: cd backend && npm run dev\n• Same Wi-Fi network\n• Firewall allows port 5050`;
        setServerError(errorMsg);
      } else if (e?.message?.includes('Network request failed') || e?.message?.includes('Failed to fetch') || e?.message?.includes('NetworkError')) {
        let errorMsg = `Cannot connect to server!\n\nTrying: ${currentUrl}\n\n`;
        if (isLocalhost) {
          errorMsg += `⚠️ localhost won't work on physical devices!\n\n`;
          errorMsg += `Fix: EXPO_PUBLIC_API_URL="http://10.214.87.72:5050" npx expo start -c\n\n`;
        }
        errorMsg += `Check:\n• Backend running on port 5050\n• Correct IP (current: 10.214.87.72)\n• Same Wi-Fi network\n• Firewall settings`;
        setServerError(errorMsg);
      } else {
        setServerError(e?.message || 'Login failed. Please try again.');
      }
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>CS555</Text>
            </View>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue to your account</Text>
        </View>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              style={styles.input}
              onChangeText={(t) => setValue('email', t, { shouldValidate: true })}
              {...register('email')}
            />
            {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                secureTextEntry={false}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                style={[styles.input, styles.passwordInput]}
                onChangeText={(t) => setValue('password', t, { shouldValidate: true })}
                {...register('password')}
              />
              {/* Eye icon removed - secureTextEntry disabled for demo screen recording */}
            </View>
            {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
          </View>

          {serverError && (
            <View style={styles.errorContainer}>
              <Text style={styles.error}>{serverError}</Text>
            </View>
          )}

          <Pressable
            disabled={!isValid || isSubmitting}
            onPress={handleSubmit(onSubmit)}
            style={[styles.button, (!isValid || isSubmitting) && styles.buttonDisabled]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <Link href={"/(auth)/signup" as any} asChild>
              <Pressable>
                <Text style={styles.signupLink}>Create Account</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    flex: 1,
    padding: 24,
    paddingTop: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#111827',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    // paddingRight removed - no eye icon needed (secureTextEntry disabled for demo)
  },
  error: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 6,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#A5B4FC',
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: '#6B7280',
    fontSize: 15,
  },
  signupLink: {
    color: '#6366F1',
    fontSize: 15,
    fontWeight: '700',
  },
});
