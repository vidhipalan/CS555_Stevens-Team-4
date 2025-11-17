import { createGratitudeEntry, deleteGratitudeEntry, getGratitudeEntries, updateGratitudeEntry } from '@/app/api/gratitude';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

interface GratitudeEntry {
  _id: string;
  title: string;
  content: string;
  date: string;
  isDraft: boolean;
  tags: string[];
  mood?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Custom hook to manage gratitude entries data fetching
 * Extracted from God Component to separate data fetching concern
 */
export function useGratitudeEntries(token: string | null) {
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const data = await getGratitudeEntries(token, {
        limit: 50
      });
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Error loading entries:', error);
      Alert.alert('Error', 'Failed to load gratitude entries');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  }, [loadEntries]);

  const saveEntry = useCallback(async (entryData: Partial<GratitudeEntry>, entryId?: string) => {
    if (!token) return false;

    try {
      if (entryId) {
        await updateGratitudeEntry(token, entryId, entryData);
      } else {
        await createGratitudeEntry(token, entryData);
      }
      await loadEntries();
      return true;
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save entry');
      return false;
    }
  }, [token, loadEntries]);

  const removeEntry = useCallback(async (id: string) => {
    if (!token) return false;

    try {
      await deleteGratitudeEntry(token, id);
      await loadEntries();
      return true;
    } catch (error) {
      console.error('Error deleting entry:', error);
      Alert.alert('Error', 'Failed to delete entry');
      return false;
    }
  }, [token, loadEntries]);

  return {
    entries,
    loading,
    refreshing,
    loadEntries,
    onRefresh,
    saveEntry,
    removeEntry,
  };
}

