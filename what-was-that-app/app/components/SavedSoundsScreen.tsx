import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
  ScrollView,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { MotiView } from "moti";
import { Trash2, Volume2, Plus, Edit2, X } from "lucide-react-native";

type SoundCategory = 'safety' | 'daily' | 'personal';

interface SavedSound {
  id: string;
  label: string;
  category: SoundCategory;
  dateAdded: string;
  timesDetected: number;
  enabled: boolean;
  audioData: string;
  audioUri?: string; // Local URI for playback
}

interface SavedSoundsScreenProps {
  sounds: SavedSound[];
  onToggleSound: (id: string) => void;
  onDeleteSound: (id: string) => void;
  onTeachSound: () => void;
  onEditSound?: (id: string, newLabel: string, newCategory: SoundCategory) => void;
}

const COLORS = {
  bg: "#F5F5F7",
  card: "#FFFFFF",
  bgLight: "#F5F5F7",
  textPrimary: "#1F1F1F",
  textSecondary: "#757575",
  primary: "#4A6572", // Darker for better contrast
  detected: "#4A6572", // Darker for better contrast
  critical: "#D32F2F",
  safety: "#D32F2F",
  daily: "#4A6572",
  personal: "#9C27B0",
};

export default function SavedSoundsScreen({
  sounds,
  onToggleSound,
  onDeleteSound,
  onTeachSound,
  onEditSound,
}: SavedSoundsScreenProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<SoundCategory | 'all'>('all');
  const [editingSound, setEditingSound] = useState<SavedSound | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editCategory, setEditCategory] = useState<SoundCategory>('personal');
  const soundRef = useRef<Audio.Sound | null>(null);
  
  // Filter sounds by category
  const filteredSounds = filterCategory === 'all' 
    ? sounds 
    : sounds.filter(s => s.category === filterCategory);
  
  // Handler to open edit modal for a sound
  const handleEditSound = (sound: SavedSound) => {
    setEditingSound(sound);
    setEditLabel(sound.label);
    setEditCategory(sound.category);
  };
  
  const handleSaveEdit = () => {
    if (editingSound && onEditSound && editLabel.trim()) {
      onEditSound(editingSound.id, editLabel.trim(), editCategory);
      setEditingSound(null);
    }
  };
  
  const handleCancelEdit = () => {
    setEditingSound(null);
    setEditLabel('');
  };

  // Setup audio mode and cleanup on unmount
  useEffect(() => {
    // Configure audio mode for loud playback
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    }).catch(console.error);

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(console.error);
      }
    };
  }, []);

  const togglePlaySound = async (sound: SavedSound) => {
    try {
      // If this sound is currently playing, pause it
      if (playingId === sound.id) {
        if (soundRef.current) {
          await soundRef.current.pauseAsync();
          setPlayingId(null);
        }
        return;
      }

      // Stop any currently playing sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // If no audioUri, show alert
      console.log('🔍 Attempting to play sound:', sound.label);
      console.log('🔍 Sound audioUri:', sound.audioUri);
      console.log('🔍 Sound audioData:', sound.audioData);
      
      if (!sound.audioUri) {
        console.log('❌ No audioUri found for sound');
        Alert.alert(
          "No Audio Available",
          "This sound was saved before audio recording was implemented. Re-record it to enable playback."
        );
        return;
      }
      
      console.log('✅ audioUri exists, attempting playback from:', sound.audioUri);

      // Load and play the new sound at full volume
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: sound.audioUri },
        { shouldPlay: true, volume: 1.0 }
      );
      
      soundRef.current = newSound;
      setPlayingId(sound.id);
      
      // Ensure volume is at maximum
      await newSound.setVolumeAsync(1.0);

      // When playback finishes, reset state
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
        }
      });
    } catch (error) {
      console.error("Failed to play sound:", error);
      Alert.alert("Error", "Failed to play audio sample.");
      setPlayingId(null);
    }
  };
  const soundRefs = useRef<Map<string, Audio.Sound>>(new Map());

  useEffect(() => {
    // Cleanup sounds on unmount
    return () => {
      soundRefs.current.forEach((sound) => {
        sound.unloadAsync().catch(console.error);
      });
      soundRefs.current.clear();
    };
  }, []);

  const confirmDelete = (sound: SavedSound) => {
    Alert.alert(
      "Delete sound?",
      `Delete "${sound.label}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // Stop and cleanup sound if playing
            if (soundRefs.current.has(sound.id)) {
              soundRefs.current.get(sound.id)?.unloadAsync().catch(console.error);
              soundRefs.current.delete(sound.id);
            }
            if (playingId === sound.id) {
              setPlayingId(null);
            }
            onDeleteSound(sound.id);
          },
        },
      ],
      { cancelable: true }
    );
  };

  const playSound = async (sound: SavedSound) => {
    try {
      // Stop any currently playing sound
      if (playingId && playingId !== sound.id) {
        await stopSound(playingId);
      }

      // If this sound is already playing, stop it
      if (playingId === sound.id) {
        await stopSound(sound.id);
        return;
      }

      // If no audio URI, show error
      if (!sound.audioUri) {
        Alert.alert(
          "No Audio Available",
          "This sound doesn't have a playable audio file. Please re-record it."
        );
        return;
      }

      // Unload previous sound for this ID if exists
      if (soundRefs.current.has(sound.id)) {
        await soundRefs.current.get(sound.id)?.unloadAsync();
        soundRefs.current.delete(sound.id);
      }

      // Check if file exists (for local files)
      if (sound.audioUri.startsWith('file://') || !sound.audioUri.startsWith('http')) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(sound.audioUri);
          if (!fileInfo.exists) {
            Alert.alert(
              "File Not Found",
              "The audio file is missing. Please re-record this sound."
            );
            return;
          }
        } catch (fileCheckError) {
          console.log("Could not check file existence, proceeding anyway:", fileCheckError);
        }
      }

      console.log("Playing audio from URI:", sound.audioUri);

      // Set audio mode for playback - route through speaker at max volume
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false, // Use speaker on Android
        allowsRecordingIOS: false, // Not recording, just playing
      });

      // Create and play new sound
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: sound.audioUri },
        {
          shouldPlay: true,
          volume: 1.0, // Maximum volume
          isMuted: false,
          rate: 1.0,
        }
      );

      // Set volume to maximum explicitly (some platforms need this)
      await audioSound.setVolumeAsync(1.0);
      
      // Ensure it's not muted
      await audioSound.setIsMutedAsync(false);
      
      // On iOS, we might need to set the audio session category
      if (Platform.OS === 'ios') {
        // The audio mode should handle this, but we ensure volume is max
        try {
          await audioSound.setVolumeAsync(1.0);
        } catch (e) {
          console.log("Could not set volume:", e);
        }
      }

      soundRefs.current.set(sound.id, audioSound);
      setPlayingId(sound.id);

      // Handle playback status
      audioSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlayingId(status.isPlaying ? sound.id : null);
          if (status.didJustFinish) {
            setPlayingId(null);
          }
        } else if (status.error) {
          console.error("Playback error:", status.error);
          setPlayingId(null);
        }
      });
    } catch (err: any) {
      console.error("Failed to play sound:", err);
      Alert.alert(
        "Playback Error", 
        err.message || "Failed to play audio. The file may be missing or corrupted."
      );
      setPlayingId(null);
      // Clean up on error
      if (soundRefs.current.has(sound.id)) {
        soundRefs.current.delete(sound.id);
      }
    }
  };

  const stopSound = async (soundId: string) => {
    try {
      const sound = soundRefs.current.get(soundId);
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        soundRefs.current.delete(soundId);
      }
      if (playingId === soundId) {
        setPlayingId(null);
      }
    } catch (err) {
      console.error("Failed to stop sound:", err);
    }
  };

  const getCategoryColor = (category: SoundCategory) => {
    switch (category) {
      case 'safety': return COLORS.safety;
      case 'daily': return COLORS.daily;
      case 'personal': return COLORS.personal;
      default: return COLORS.textSecondary;
    }
  };

  const getCategoryLabel = (category: SoundCategory) => {
    switch (category) {
      case 'safety': return 'Safety';
      case 'daily': return 'Daily';
      case 'personal': return 'Personal';
      default: return '';
    }
  };

  return (
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Sounds</Text>
      <Text style={styles.subtitle}>
        {sounds.length} {sounds.length === 1 ? "sound" : "sounds"} ready to detect
      </Text>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <Pressable 
          onPress={() => setFilterCategory('all')}
          style={[styles.filterTab, filterCategory === 'all' && styles.filterTabActive]}
        >
          <Text style={[styles.filterTabText, filterCategory === 'all' && styles.filterTabTextActive]}>
            All
          </Text>
        </Pressable>
        <Pressable 
          onPress={() => setFilterCategory('safety')}
          style={[styles.filterTab, filterCategory === 'safety' && styles.filterTabActive]}
        >
          <Text style={[styles.filterTabText, filterCategory === 'safety' && styles.filterTabTextActive]}>
            Safety
          </Text>
        </Pressable>
        <Pressable 
          onPress={() => setFilterCategory('daily')}
          style={[styles.filterTab, filterCategory === 'daily' && styles.filterTabActive]}
        >
          <Text style={[styles.filterTabText, filterCategory === 'daily' && styles.filterTabTextActive]}>
            Daily
          </Text>
        </Pressable>
        <Pressable 
          onPress={() => setFilterCategory('personal')}
          style={[styles.filterTab, filterCategory === 'personal' && styles.filterTabActive]}
        >
          <Text style={[styles.filterTabText, filterCategory === 'personal' && styles.filterTabTextActive]}>
            Personal
          </Text>
        </Pressable>
      </View>

      {/* Teach New Sound Button */}
      <Pressable onPress={onTeachSound} style={styles.teachBtn}>
        <Plus size={20} color="white" />
        <Text style={styles.teachBtnText}>Record a sound</Text>
      </Pressable>

      {filteredSounds.length === 0 ? (
        <View style={styles.emptyCard}>
          <Volume2 size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>
            {filterCategory === 'all' ? 'No sounds saved yet' : `No ${filterCategory} sounds`}
          </Text>
          <Text style={styles.emptyBody}>
            {filterCategory === 'all' ? 'Record a new sound to recognize' : 'Try a different filter or record a new sound'}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredSounds.map((sound, idx) => {
            const expanded = expandedId === sound.id;
            const isPlaying = playingId === sound.id;

            return (
              <MotiView
                key={sound.id}
                style={styles.card}
                from={{ opacity: 0, translateY: 14 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: "timing", duration: 220, delay: idx * 60 }}
              >
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Text style={styles.soundLabel}>{sound.label}</Text>
                      <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(sound.category) + '20', borderColor: getCategoryColor(sound.category) }]}>
                        <Text style={[styles.categoryBadgeText, { color: getCategoryColor(sound.category) }]}>
                          {getCategoryLabel(sound.category)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.meta}>
                      Added {sound.dateAdded}
                    </Text>

                    <Text style={styles.metaSmall}>
                      Detected {sound.timesDetected}{" "}
                      {sound.timesDetected === 1 ? "time" : "times"}
                    </Text>
                  </View>

                  {/* Toggle */}
                  <Switch
                    value={sound.enabled}
                    onValueChange={() => onToggleSound(sound.id)}
                    trackColor={{
                      false: "#9E9E9E",
                      true: COLORS.detected,
                    }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  {/* Playback button - 2 cols (50%) */}
                  <Pressable
                    onPress={() => playSound(sound)}
                    style={[styles.actionBtn, styles.playbackBtn, isPlaying && styles.actionBtnPlaying]}
                  >
                    <Volume2 size={18} color={isPlaying ? "#FFFFFF" : COLORS.primary} />
                    <Text style={[styles.actionBtnText, isPlaying && styles.playingText]}>
                      {isPlaying ? "Playing..." : "Play Sample"}
                    </Text>
                  </Pressable>

                  {/* Edit button - 1 col (25%) - icon only */}
                  <Pressable
                    onPress={() => handleEditSound(sound)}
                    style={[styles.actionBtn, styles.iconBtn]}
                  >
                    <Edit2 size={18} color={COLORS.primary} />
                  </Pressable>

                  {/* Delete button - 1 col (25%) - icon only */}
                  <Pressable
                    onPress={() => confirmDelete(sound)}
                    style={[styles.deleteBtn, styles.iconBtn]}
                  >
                    <Trash2 size={18} color={COLORS.critical} />
                  </Pressable>
                </View>

                {/* Expanded details */}
                {expanded && (
                  <MotiView
                    style={styles.expanded}
                    from={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" as any }}
                    transition={{ type: "timing", duration: 200 }}
                  >
                    <Text style={styles.expandedText}>
                      Audio ID: {sound.audioData}
                    </Text>
                    <Text style={styles.expandedSubtext}>
                      This sound will be matched against detected vibration patterns
                    </Text>
                  </MotiView>
                )}
              </MotiView>
            );
          })}
        </View>
      )}
      
      {/* Edit Modal */}
      <Modal
        visible={editingSound !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Sound</Text>
              <Pressable onPress={handleCancelEdit} style={styles.modalCloseBtn}>
                <X size={24} color={COLORS.textSecondary} />
              </Pressable>
            </View>
            
            <Text style={styles.inputLabel}>Sound Name</Text>
            <TextInput
              style={styles.input}
              value={editLabel}
              onChangeText={setEditLabel}
              placeholder="Enter sound name"
              placeholderTextColor={COLORS.textSecondary}
            />
            
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryButtons}>
              <Pressable
                onPress={() => setEditCategory('safety')}
                style={[
                  styles.categoryButton,
                  editCategory === 'safety' && styles.categoryButtonActive,
                  { borderColor: COLORS.safety }
                ]}
              >
                <Text style={[
                  styles.categoryButtonText,
                  editCategory === 'safety' && { color: COLORS.safety }
                ]}>
                  Safety
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setEditCategory('daily')}
                style={[
                  styles.categoryButton,
                  editCategory === 'daily' && styles.categoryButtonActive,
                  { borderColor: COLORS.daily }
                ]}
              >
                <Text style={[
                  styles.categoryButtonText,
                  editCategory === 'daily' && { color: COLORS.daily }
                ]}>
                  Daily
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setEditCategory('personal')}
                style={[
                  styles.categoryButton,
                  editCategory === 'personal' && styles.categoryButtonActive,
                  { borderColor: COLORS.personal }
                ]}
              >
                <Text style={[
                  styles.categoryButtonText,
                  editCategory === 'personal' && { color: COLORS.personal }
                ]}>
                  Personal
                </Text>
              </Pressable>
            </View>
            
            <View style={styles.modalActions}>
              <Pressable onPress={handleCancelEdit} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSaveEdit} style={styles.modalSaveBtn}>
                <Text style={styles.modalSaveBtnText}>Save Changes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100, // Extra padding for bottom nav
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginBottom: 16,
    fontSize: 15,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalCloseBtn: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: COLORS.card,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.bg,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  modalCancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  modalSaveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  teachBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  teachBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 32,
    alignItems: "center",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    marginTop: 12,
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 18,
  },
  emptyBody: {
    marginTop: 6,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 14,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  soundLabel: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  meta: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 2,
  },
  metaSmall: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  playbackBtn: {
    flex: 2, // Takes 2 of 4 columns (50%)
  },
  iconBtn: {
    flex: 1, // Takes 1 of 4 columns (25%)
    paddingHorizontal: 0, // Icon only, no text
  },
  actionBtnPlaying: {
    backgroundColor: COLORS.detected,
    borderColor: COLORS.detected,
  },
  playingText: {
    color: '#FFFFFF',
  },
  actionBtnText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  infoBtn: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  deleteBtn: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  expanded: {
    marginTop: 12,
    backgroundColor: COLORS.bgLight,
    borderRadius: 14,
    padding: 12,
    overflow: "hidden",
  },
  expandedText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 6,
  },
  expandedSubtext: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});
