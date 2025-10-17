import Ionicons from '@expo/vector-icons/Ionicons';
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
      {/* Header with greeting */}
      <View style={styles.header}>
        <Text style={styles.title}>Good Day, {email || 'User'}!</Text>
      </View>

      {/* Main content area */}
      <View style={styles.content}>
        {/* Log Mood Button */}
        <Link href={logMoodHref} asChild>
          <Pressable style={styles.featureButton}>
            <View style={styles.buttonContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="happy-outline" size={24} color="#E91E63" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.buttonTitle}>Log Mood</Text>
                <Text style={styles.buttonDescription}>Track your daily emotional state and feelings</Text>
              </View>
            </View>
          </Pressable>
        </Link>

        {/* View Mood History Button */}
        <Link href={("/(tabs)/mood-history" as unknown as any)} asChild>
          <Pressable style={styles.featureButton}>
            <View style={styles.buttonContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="bar-chart-outline" size={24} color="#2196F3" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.buttonTitle}>View Mood History</Text>
                <Text style={styles.buttonDescription}>Review your mood patterns and trends over time</Text>
              </View>
            </View>
          </Pressable>
        </Link>

        {/* Gratitude Journal Button */}
        <Link href={("/(tabs)/gratitude" as unknown as any)} asChild>
          <Pressable style={styles.featureButton}>
            <View style={styles.buttonContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="heart-outline" size={24} color="#E91E63" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.buttonTitle}>Gratitude Journal</Text>
                <Text style={styles.buttonDescription}>Record things you're grateful for each day</Text>
              </View>
            </View>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'left',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  featureButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 18,
  },
});
