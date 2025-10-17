import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { API_ENDPOINTS } from '@/constants/config';

interface MoodEntry {
  _id: string;
  userId: {
    email: string;
    role: string;
  };
  mood: string;
  note: string;
  date: string;
  createdAt: string;
}

export default function DashboardScreen() {
  const [email, setEmail] = useState<string>('');
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMoods = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(API_ENDPOINTS.MOODS.ALL_PATIENTS, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch moods');
      }

      const data = await response.json();
      setMoods(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load moods');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      const e = await SecureStore.getItemAsync('user_email');
      if (e) setEmail(e);
      await fetchMoods();
    };
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMoods();
  };

  const getMoodEmoji = (mood: string) => {
    const moodMap: { [key: string]: string } = {
      happy: '😊',
      neutral: '😐',
      sad: '😢',
      angry: '😠',
      anxious: '😰',
      excited: '🤩',
      tired: '😴',
    };
    return moodMap[mood] || '😐';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderMoodItem = ({ item }: { item: MoodEntry }) => (
    <View style={styles.moodCard}>
      <View style={styles.moodHeader}>
        <View style={styles.moodInfo}>
          <Text style={styles.moodEmoji}>{getMoodEmoji(item.mood)}</Text>
          <View>
            <Text style={styles.moodPatient}>{item.userId?.email || 'Unknown'}</Text>
            <Text style={styles.moodDate}>{formatDate(item.date)}</Text>
          </View>
        </View>
        <View style={[styles.moodBadge, { backgroundColor: getMoodColor(item.mood) }]}>
          <Text style={styles.moodBadgeText}>{item.mood}</Text>
        </View>
      </View>
      {item.note && (
        <Text style={styles.moodNote}>{item.note}</Text>
      )}
    </View>
  );

  const getMoodColor = (mood: string) => {
    const colorMap: { [key: string]: string } = {
      happy: '#10B981',
      neutral: '#6B7280',
      sad: '#3B82F6',
      angry: '#EF4444',
      anxious: '#F59E0B',
      excited: '#8B5CF6',
      tired: '#6366F1',
    };
    return colorMap[mood] || '#6B7280';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Clinician Dashboard</Text>
        <Text style={styles.subtitle}>Welcome, {email || 'Doctor'}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{moods.length}</Text>
          <Text style={styles.statLabel}>Total Entries</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{new Set(moods.map(m => m.userId?.email)).size}</Text>
          <Text style={styles.statLabel}>Patients</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Mood Entries</Text>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={fetchMoods}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : moods.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No mood entries yet</Text>
          </View>
        ) : (
          <FlatList
            data={moods}
            renderItem={renderMoodItem}
            keyExtractor={(item) => item._id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    backgroundColor: '#6366F1',
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6366F1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  section: {
    flex: 1,
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  moodCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  moodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moodEmoji: {
    fontSize: 32,
  },
  moodPatient: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  moodDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  moodBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  moodBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  moodNote: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginTop: 4,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
