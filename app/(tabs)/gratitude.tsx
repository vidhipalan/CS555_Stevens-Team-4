import {
  createGratitudeEntry,
  deleteGratitudeEntry,
  getGratitudeEntries,
  updateGratitudeEntry
} from '@/app/api/gratitude';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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

export default function GratitudeJournal() {
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GratitudeEntry | null>(null);
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    isDraft: false,
  });
  const [autosaveTimeout, setAutosaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();

  useEffect(() => {
    loadToken();
  }, []);

  useEffect(() => {
    if (token) {
      loadEntries();
    }
  }, [token, selectedDate]);

  const loadToken = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('auth_token');
      setToken(storedToken);
    } catch (error) {
      console.error('Error loading token:', error);
      router.replace('/(auth)/login' as any);
    }
  };

  const loadEntries = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const data = await getGratitudeEntries(token, {
        startDate: selectedDate,
        endDate: selectedDate,
        limit: 50
      });
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Error loading entries:', error);
      Alert.alert('Error', 'Failed to load gratitude entries');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEntries();
    setRefreshing(false);
  }, [token, selectedDate]);

  const handleSaveEntry = async (isDraft = false) => {
    if (!token) return;

    // Clear any pending autosave
    if (autosaveTimeout) {
      clearTimeout(autosaveTimeout);
      setAutosaveTimeout(null);
    }

    try {
      const entryData = {
        title: newEntry.title || 'Untitled Entry',
        content: newEntry.content || 'No content provided',
        isDraft,
        date: selectedDate,
      };

      if (editingEntry) {
        await updateGratitudeEntry(token, editingEntry._id, entryData);
      } else {
        await createGratitudeEntry(token, entryData);
      }

      setShowCreateModal(false);
      setEditingEntry(null);
      setNewEntry({ title: '', content: '', isDraft: false });
      loadEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save entry');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!token) return;

    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this gratitude entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGratitudeEntry(token, id);
              loadEntries();
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  const handleEditEntry = (entry: GratitudeEntry) => {
    setEditingEntry(entry);
    setNewEntry({
      title: entry.title,
      content: entry.content,
      isDraft: entry.isDraft,
    });
    setShowCreateModal(true);
  };


  // Autosave functionality
  const handleContentChange = (content: string) => {
    setNewEntry(prev => ({ ...prev, content }));
    
    // Clear existing timeout
    if (autosaveTimeout) {
      clearTimeout(autosaveTimeout);
    }
    
    // Set new timeout for autosave (only if content is substantial)
    const timeout = setTimeout(() => {
      if (content.trim().length > 10 && token) {
        // Only autosave if we have substantial content
        const autosaveData = {
          title: newEntry.title || 'Untitled Entry',
          content: content || 'No content provided',
          isDraft: true,
          date: selectedDate,
        };
        
        if (editingEntry) {
          updateGratitudeEntry(token, editingEntry._id, autosaveData).catch(console.error);
        } else {
          createGratitudeEntry(token, autosaveData).catch(console.error);
        }
      }
    }, 5000); // Autosave after 5 seconds of inactivity
    
    setAutosaveTimeout(timeout);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getMoodEmoji = (mood?: string) => {
    const moodEmojis: { [key: string]: string } = {
      'very-happy': '😄',
      'happy': '😊',
      'neutral': '😐',
      'sad': '😔',
      'very-sad': '😢',
    };
    return moodEmojis[mood || 'neutral'] || '😐';
  };

  const renderEntry = ({ item }: { item: GratitudeEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryTitle}>{item.title}</Text>
        <View style={styles.entryActions}>
          <TouchableOpacity
            onPress={() => handleEditEntry(item)}
            style={styles.actionButton}
          >
            <Ionicons name="pencil" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteEntry(item._id)}
            style={styles.actionButton}
          >
            <Ionicons name="trash" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.entryContent} numberOfLines={3}>
        {item.content}
      </Text>
      
      <View style={styles.entryFooter}>
        <Text style={styles.entryDate}>{formatDate(item.date)}</Text>
        {item.mood && (
          <Text style={styles.moodIndicator}>
            {getMoodEmoji(item.mood)}
          </Text>
        )}
        {item.isDraft && (
          <Text style={styles.draftIndicator}>Draft</Text>
        )}
      </View>
      
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading gratitude entries...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gratitude Journal</Text>
      </View>

      <View style={styles.dateContainer}>
        <TextInput
          style={styles.dateInput}
          value={selectedDate}
          onChangeText={setSelectedDate}
          placeholder="YYYY-MM-DD"
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingEntry(null);
            setNewEntry({ title: '', content: '', isDraft: false });
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.entriesList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No gratitude entries yet</Text>
            <Text style={styles.emptySubtext}>Start by adding your first entry!</Text>
          </View>
        }
      />

      {/* Create/Edit Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowCreateModal(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingEntry ? 'Edit Entry' : 'New Entry'}
            </Text>
            <TouchableOpacity
              onPress={() => handleSaveEntry(false)}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.titleInput}
              placeholder="Entry title..."
              value={newEntry.title}
              onChangeText={(text) => setNewEntry(prev => ({ ...prev, title: text }))}
              maxLength={100}
            />

            <TextInput
              style={styles.contentInput}
              placeholder="What are you grateful for today?"
              value={newEntry.content}
              onChangeText={handleContentChange}
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />

            <Text style={styles.characterCount}>
              {newEntry.content.length}/2000 characters
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginRight: 15,
    fontSize: 16,
  },
  entriesList: {
    padding: 15,
  },
  entryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  entryActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
  },
  entryContent: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 10,
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDate: {
    fontSize: 14,
    color: '#999',
  },
  moodIndicator: {
    fontSize: 20,
  },
  draftIndicator: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    padding: 5,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    padding: 5,
  },
  saveButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  contentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 200,
    marginBottom: 10,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
  },
});
