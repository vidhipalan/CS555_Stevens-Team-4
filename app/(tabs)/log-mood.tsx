import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getToday, saveToday } from '@/lib/api/moods';

type MoodKey = 'happy' | 'neutral' | 'sad' | 'angry' | 'anxious' | 'excited' | 'tired';

const MOODS: Array<{ key: MoodKey; label: string; emoji: string; color: string }> = [
  { key: 'happy', label: 'Happy', emoji: '😊', color: '#F59E0B' },
  { key: 'excited', label: 'Excited', emoji: '🤩', color: '#10B981' },
  { key: 'neutral', label: 'Neutral', emoji: '😐', color: '#6B7280' },
  { key: 'tired', label: 'Tired', emoji: '🥱', color: '#8B5CF6' },
  { key: 'anxious', label: 'Anxious', emoji: '😟', color: '#EF4444' },
  { key: 'sad', label: 'Sad', emoji: '😔', color: '#3B82F6' },
  { key: 'angry', label: 'Angry', emoji: '😠', color: '#DC2626' },
];

export default function LogMoodScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);
  const [selected, setSelected] = useState<MoodKey | null>(null);

  const handleBack = async () => {
    // Get user role to navigate to correct screen
    const userRole = await SecureStore.getItemAsync('user_role');
    if (userRole === 'clinician') {
      router.replace('/(tabs)/dashboard' as any);
    } else {
      router.replace('/(tabs)' as any);
    }
  };
  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [note, setNote] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const disabled = useMemo(() => saving || !selected || exists, [saving, selected, exists]);

  // Reset screen to today's date when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const resetToToday = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const today = `${y}-${m}-${d}`;
        
        setDate(today);
        setSelectedYear(y);
        setSelectedMonth(now.getMonth() + 1); // Number, not string
        setSelectedDay(now.getDate()); // Number, not string
        setSelected(null);
        setNote('');
        setExists(false);
        setShowDatePicker(false);
      };
      
      resetToToday();
    }, [])
  );

  useEffect(() => {
    const init = async () => {
      const t = await SecureStore.getItemAsync('auth_token');
      setToken(t);
      try {
        if (t) {
          const existing = await getToday(t, date);
          if (existing) {
            setSelected(existing.mood as MoodKey);
            setNote(existing.note || '');
            setExists(true);
          } else {
            setSelected(null);
            setNote('');
            setExists(false);
          }
        }
      } catch (_err) {
        // ignore; treat as not set
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [date]);

  const handleSave = async () => {
    if (!token || !selected) return;
    setSaving(true);
    try {
      await saveToday(token, selected, note.trim(), date);
      // Get user role to navigate to correct screen
      const userRole = await SecureStore.getItemAsync('user_role');
      Alert.alert('Saved', "Today's mood has been logged.", [
        { 
          text: 'OK', 
          onPress: () => {
            // Navigate to home screen based on role
            if (userRole === 'clinician') {
              router.replace('/(tabs)/dashboard' as any);
            } else {
              router.replace('/(tabs)' as any);
            }
          }
        },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save mood');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" testID="activity-indicator" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Log Mood</Text>
        </View>
      </View>
      <Text style={styles.label}>Select date</Text>
      <View style={styles.dateRow}>
        {getLastNDays(7).map((d) => (
          <Pressable
            key={d}
            style={[styles.chip, d === date && styles.chipActive]}
            onPress={() => setDate(d)}
          >
            <Text style={[styles.chipText, d === date && styles.chipTextActive]}>{formatChip(d)}</Text>
          </Pressable>
        ))}
        <Pressable
          style={[styles.chip, styles.chipCustom, !getLastNDays(7).includes(date) && styles.chipCustomActive]}
          onPress={() => {
            // Initialize picker with current selected date
            // Parse YYYY-MM-DD format correctly
            const [y, m, d] = date.split('-').map(Number);
            setSelectedYear(y);
            setSelectedMonth(m);
            setSelectedDay(d);
            setShowDatePicker(true);
          }}
        >
          <Ionicons name="calendar-outline" size={16} color={!getLastNDays(7).includes(date) ? "#fff" : "#6366F1"} style={{ marginRight: 4 }} />
          <Text style={[styles.chipText, !getLastNDays(7).includes(date) && { color: '#fff' }]}>
            {!getLastNDays(7).includes(date) ? formatChip(date) : 'Other Date'}
          </Text>
        </Pressable>
      </View>
      
      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <Pressable onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </Pressable>
            </View>
            
            <View style={styles.pickerContainer}>
              <View style={styles.pickerGroup}>
                <Text style={styles.pickerLabel}>Month</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedMonth}
                    onValueChange={(value: number) => {
                      setSelectedMonth(value);
                      // Adjust day if it's invalid for the new month
                      const daysInMonth = new Date(selectedYear, value, 0).getDate();
                      if (selectedDay > daysInMonth) {
                        setSelectedDay(daysInMonth);
                      }
                    }}
                    style={styles.picker}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <Picker.Item
                        key={month}
                        label={new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'long' })}
                        value={month}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
              
              <View style={styles.pickerGroup}>
                <Text style={styles.pickerLabel}>Day</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedDay}
                    onValueChange={setSelectedDay}
                    style={styles.picker}
                  >
                    {Array.from(
                      { length: new Date(selectedYear, selectedMonth, 0).getDate() },
                      (_, i) => i + 1
                    ).map((day) => (
                      <Picker.Item key={day} label={String(day)} value={day} />
                    ))}
                  </Picker>
                </View>
              </View>
              
              <View style={styles.pickerGroup}>
                <Text style={styles.pickerLabel}>Year</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedYear}
                    onValueChange={(value: number) => {
                      setSelectedYear(value);
                      // Adjust day if it's invalid for the new year (leap year)
                      const daysInMonth = new Date(value, selectedMonth, 0).getDate();
                      if (selectedDay > daysInMonth) {
                        setSelectedDay(daysInMonth);
                      }
                    }}
                    style={styles.picker}
                  >
                    {Array.from(
                      { length: 100 },
                      (_, i) => new Date().getFullYear() - i
                    ).map((year) => (
                      <Picker.Item key={year} label={String(year)} value={year} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
            
            <Pressable
              style={styles.modalButton}
              onPress={async () => {
                const newDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
                setDate(newDate);
                setShowDatePicker(false);
                
                // Reload mood data for the new date
                const t = await SecureStore.getItemAsync('auth_token');
                if (t) {
                  try {
                    const existing = await getToday(t, newDate);
                    if (existing) {
                      setSelected(existing.mood as MoodKey);
                      setNote(existing.note || '');
                      setExists(true);
                    } else {
                      setSelected(null);
                      setNote('');
                      setExists(false);
                    }
                  } catch (_err) {
                    // ignore; treat as not set
                  }
                }
              }}
            >
              <Text style={styles.modalButtonText}>Select Date</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Text style={styles.subtitle}>Select the emoji that best represents how you feel.</Text>

      <View style={styles.grid}>
        {MOODS.map((m) => {
          const isSelected = selected === m.key;
          return (
            <Pressable
              key={m.key}
              style={[styles.moodCard, isSelected && { borderColor: m.color, backgroundColor: '#fff' }]}
              onPress={() => setSelected(m.key)}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
              <Text style={styles.moodLabel}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Add any thoughts or context..."
        placeholderTextColor="#9CA3AF"
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={4}
      />

      <Pressable style={[styles.saveButton, disabled && styles.saveButtonDisabled]} disabled={disabled} onPress={handleSave}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>{exists ? 'Already logged' : (selected ? 'Save Mood' : 'Select a mood to continue')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  moodCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  moodLabel: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    fontSize: 15,
    color: '#111827',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#A5B4FC',
    shadowOpacity: 0,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#6366F1',
  },
  chipText: {
    color: '#111827',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  chipCustom: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  chipCustomActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  pickerGroup: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 150,
    backgroundColor: '#F9FAFB',
  },
  modalButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});

function getLastNDays(n: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${dd}`);
  }
  return days;
}

function formatChip(iso: string): string {
  const [y, m, d] = iso.split('-');
  const today = new Date();
  const isoToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (iso === isoToday) return 'Today';
  return `${m}/${d}`;
}


