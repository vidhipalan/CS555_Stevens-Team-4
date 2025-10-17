import { API_ENDPOINTS } from '@/constants/config';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

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

interface GratitudeEntry {
  _id: string;
  title: string;
  content: string;
  date: string;
  createdAt: string;
  isDraft: boolean;
}

export default function PatientDetailScreen() {
  const { patientId, patientEmail } = useLocalSearchParams<{ patientId: string; patientEmail: string }>();
  const [activeTab, setActiveTab] = useState<'moods' | 'gratitude'>('moods');
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [gratitudeEntries, setGratitudeEntries] = useState<GratitudeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPatientData = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      // Fetch moods for this patient
      const moodsResponse = await fetch(API_ENDPOINTS.MOODS.ALL_PATIENTS, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (moodsResponse.ok) {
        const allMoods = await moodsResponse.json();
        const patientMoods = allMoods.filter((mood: MoodEntry) => mood.userId._id === patientId);
        setMoods(patientMoods);
      }

      // Fetch gratitude entries for this patient
      const gratitudeResponse = await fetch(`${API_ENDPOINTS.GRATITUDE.ENTRIES}?userId=${patientId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (gratitudeResponse.ok) {
        const gratitudeData = await gratitudeResponse.json();
        setGratitudeEntries(gratitudeData.entries || []);
      }

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load patient data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchPatientData();
    }
  }, [patientId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPatientData();
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

  const renderGratitudeItem = ({ item }: { item: GratitudeEntry }) => (
    <View style={styles.gratitudeCard}>
      <View style={styles.gratitudeHeader}>
        <Text style={styles.gratitudeTitle}>{item.title}</Text>
        <Text style={styles.gratitudeDate}>{formatDate(item.date)}</Text>
      </View>
      <Text style={styles.gratitudeContent}>{item.content}</Text>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchPatientData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    if (activeTab === 'moods') {
      if (moods.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No mood entries yet</Text>
          </View>
        );
      }

      return (
        <FlatList
          data={moods}
          renderItem={renderMoodItem}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
        />
      );
    } else {
      if (gratitudeEntries.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No gratitude entries yet</Text>
          </View>
        );
      }

      return (
        <FlatList
          data={gratitudeEntries}
          renderItem={renderGratitudeItem}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
        />
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Patient Details</Text>
        <Text style={styles.subtitle}>{patientEmail}</Text>
      </View>

      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'moods' && styles.activeTab]}
          onPress={() => setActiveTab('moods')}
        >
          <Text style={[styles.tabText, activeTab === 'moods' && styles.activeTabText]}>
            Mood History ({moods.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'gratitude' && styles.activeTab]}
          onPress={() => setActiveTab('gratitude')}
        >
          <Text style={[styles.tabText, activeTab === 'gratitude' && styles.activeTabText]}>
            Gratitude Journal ({gratitudeEntries.length})
          </Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        {renderContent()}
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
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: '#E0E7FF',
    fontSize: 16,
    fontWeight: '600',
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
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
  gratitudeCard: {
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
  gratitudeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gratitudeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  gratitudeDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  gratitudeContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
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
