import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

interface GratitudeEntry {
  _id: string;
  title: string;
  content: string;
  date: string;
  isDraft: boolean;
  tags?: string[];
  mood?: string;
}

interface EditorState {
  title: string;
  content: string;
  isDraft: boolean;
}

/**
 * Custom hook to manage gratitude entry editor state
 * Extracted from God Component to separate modal/editor UI concern
 */
export function useGratitudeEditor(
  onSave: (entryData: Partial<GratitudeEntry>, entryId?: string) => Promise<boolean>,
  onDelete: (id: string) => Promise<boolean>,
  selectedDate: string
) {
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GratitudeEntry | null>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    title: '',
    content: '',
    isDraft: false,
  });

  const openEditor = useCallback((entry?: GratitudeEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setEditorState({
        title: entry.title,
        content: entry.content,
        isDraft: entry.isDraft,
      });
    } else {
      setEditingEntry(null);
      setEditorState({
        title: '',
        content: '',
        isDraft: false,
      });
    }
    setShowModal(true);
  }, []);

  const closeEditor = useCallback(() => {
    setShowModal(false);
    setEditingEntry(null);
    setEditorState({
      title: '',
      content: '',
      isDraft: false,
    });
  }, []);

  const handleSave = useCallback(async (isDraft = false) => {
    const entryData = {
      title: editorState.title || 'Untitled Entry',
      content: editorState.content || 'No content provided',
      isDraft,
      date: selectedDate,
    };

    const success = await onSave(entryData, editingEntry?._id);
    if (success) {
      closeEditor();
    }
  }, [editorState, editingEntry, selectedDate, onSave, closeEditor]);

  const handleDelete = useCallback(async (id: string) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this gratitude entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await onDelete(id);
            if (success) {
              closeEditor();
            }
          },
        },
      ]
    );
  }, [onDelete, closeEditor]);

  const updateEditorState = useCallback((updates: Partial<EditorState>) => {
    setEditorState(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    showModal,
    editingEntry,
    editorState,
    openEditor,
    closeEditor,
    handleSave,
    handleDelete,
    updateEditorState,
  };
}

