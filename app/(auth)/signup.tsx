// app/(auth)/signup.tsx
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, Link } from 'expo-router';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Min 6 characters'),
});
type FormValues = z.infer<typeof schema>;

export default function Signup() {
  const [secure, setSecure] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, setValue, handleSubmit, formState: { errors, isSubmitting, isValid } } =
    useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onChange' });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await SecureStore.setItemAsync('user_email', values.email);
      await SecureStore.setItemAsync('user_password', values.password);
      await SecureStore.setItemAsync('auth_token', 'demo_token'); // auto-login
      router.replace('/(tabs)');
    } catch (e: any) {
      setServerError(e?.message || 'Something went wrong');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 24, gap: 16, justifyContent: 'center' }}>
        <Text style={{ fontSize: 28, fontWeight: '700' }}>Create account</Text>

        <Text>Email</Text>
        <TextInput
          autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" style={styles.input}
          onChangeText={(t) => setValue('email', t, { shouldValidate: true })} {...register('email')}
        />
        {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

        <Text style={{ marginTop: 8 }}>Password</Text>
        <View style={{ position: 'relative' }}>
          <TextInput
            secureTextEntry={secure} placeholder="••••••••" style={styles.input}
            onChangeText={(t) => setValue('password', t, { shouldValidate: true })} {...register('password')}
          />
          <Pressable onPress={() => setSecure(s => !s)} style={styles.toggle}>
            <Text>{secure ? 'Show' : 'Hide'}</Text>
          </Pressable>
        </View>
        {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
        {serverError && <Text style={styles.error}>{serverError}</Text>}

        <Pressable disabled={!isValid || isSubmitting} onPress={handleSubmit(onSubmit)} style={styles.button}>
          {isSubmitting ? <ActivityIndicator /> : <Text style={styles.buttonText}>Create account</Text>}
        </Pressable>

        <Text style={{ marginTop: 12, textAlign: 'center' }}>
          Already have an account? <Link href="/(auth)/login" style={{ fontWeight: '700' }}>Sign in</Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles: any = {
  input: { borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff' },
  toggle: { position: 'absolute', right: 12, top: 12, padding: 4 },
  button: { backgroundColor: '#111827', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  buttonText: { color: 'white', fontWeight: '700', fontSize: 16 },
  error: { color: '#b00020', marginTop: 6 },
};
