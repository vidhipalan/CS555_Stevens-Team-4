import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { getToday, saveToday } from '@/app/api/moods';

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
  const [date, setDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [note, setNote] = useState('');
  const disabled = useMemo(() => saving || !selected || exists, [saving, selected, exists]);

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
      Alert.alert('Saved', "Today's mood has been logged.", [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
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
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Log Mood</Text>
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
      </View>
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
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


