import { useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { getHistory } from '@/app/api/moods';
import { capitalize, emojiFor, formatDate } from '@/app/utils/moodUtils';

type MoodItem = {
  _id: string;
  date: string;
  mood: string;
  note?: string;
};

export default function MoodHistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MoodItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
      setError(null);
      try {
        const token = await SecureStore.getItemAsync('auth_token');
        if (!token) throw new Error('Not authenticated');
        const data = await getHistory(token, 60);
        setItems(data || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(useCallback(() => {
    load();
    return () => {};
  }, [load]));

  if (loading) {
    return (
      <View style={styles.center}> 
        <ActivityIndicator size="large" testID="activity-indicator" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mood history</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.date}>{formatDate(item.date)}</Text>
            <Text style={styles.mood}>{emojiFor(item.mood)} {capitalize(item.mood)}</Text>
            {!!item.note && <Text style={styles.note}>{item.note}</Text>}
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#EF4444',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  date: {
    color: '#6B7280',
    marginBottom: 4,
  },
  mood: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  note: {
    color: '#374151',
  },
});


