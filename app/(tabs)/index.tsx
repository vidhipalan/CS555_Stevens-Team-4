import { Link } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const [email, setEmail] = useState<string>('');
  // Typed href may lag typegen; cast safely until types are regenerated
  const logMoodHref = '/(tabs)/log-mood' as unknown as any;

  useEffect(() => {
    const load = async () => {
      const e = await SecureStore.getItemAsync('user_email');
      if (e) setEmail(e);
    };
    load();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Good day{email ? `, ${email}` : ''}!</Text>
      <Text style={styles.subtitle}>Log your mood.</Text>

      <Link href={logMoodHref} asChild>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Log Mood</Text>
        </Pressable>
      </Link>

      <View style={{ height: 12 }} />
      <Link href={("/(tabs)/mood-history" as unknown as any)} asChild>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>View Mood History</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
