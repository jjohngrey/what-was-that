import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Animated,
  Easing,
  Alert,
  Platform,
} from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { Mic, Square, ArrowLeft, Play, Pause, RefreshCcw } from "lucide-react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

interface TeachSoundScreenProps {
  onClose: () => void;
  onSave: (label: string, audioData: string, audioUri: string) => Promise<void> | void;
  title?: string; // Optional custom title
  autoSaveName?: string; // If provided, auto-saves with this name instead of asking
}

type RecordingState = "idle" | "recording" | "recorded";

const COLORS = {
  bg: "#F5F5F7",
  card: "#FFFFFF",
  bgLight: "#F5F5F7",
  textPrimary: "#1F1F1F",
  textSecondary: "#757575",
  primary: "#4A6572", // Darker for better contrast
  detected: "#4A6572", // Darker for better contrast
  confirmed: "#4CAF50",
  critical: "#D32F2F",
};

// Get backend URL - adjust this to match your backend
const PRODUCTION_BACKEND = 'http://155.138.215.227:3000';

const getBackendUrl = () => {
  // Use production backend
  if (PRODUCTION_BACKEND) {
    return PRODUCTION_BACKEND;
  }
  
  // Otherwise use local development URL
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:3000`;
  }
  return "http://localhost:3000";
};

export default function TeachSoundScreen({ onClose, onSave, title = "Record a chime", autoSaveName }: TeachSoundScreenProps) {
  const [currentRecording, setCurrentRecording] = useState(1); // 1, 2, or 3
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [customLabel, setCustomLabel] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformAmplitudes, setWaveformAmplitudes] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [allRecordingsComplete, setAllRecordingsComplete] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationRef = useRef<number | null>(null);
  const recordingUrisRef = useRef<string[]>([]);

  // Animations
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const labelFade = useRef(new Animated.Value(0)).current;
  const saveFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Request audio permissions
    (async () => {
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      } catch (err) {
        console.error("Failed to get audio permissions", err);
      }
    })();

    Animated.timing(cardScale, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [cardScale]);

  useEffect(() => {
    // Pulse animation when recording
    if (recordingState === "recording") {
      pulse.setValue(1);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.05,
            duration: 500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulse.setValue(1);
    }
  }, [recordingState, pulse]);

  useEffect(() => {
    // Fade in label + save button when all recordings complete
    const shouldShow = allRecordingsComplete;
    Animated.timing(labelFade, {
      toValue: shouldShow ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(saveFade, {
      toValue: shouldShow ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [allRecordingsComplete, labelFade, saveFade]);

  useEffect(() => {
    return () => {
      // Cleanup
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(console.error);
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(console.error);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setRecordingState("recording");
      setRecordingDuration(0);
      if (currentRecording === 1) {
        setCustomLabel("");
      }
      setIsPlaying(false);
      setWaveformAmplitudes([]);

      // Start timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 0.1);
      }, 100);

      // Start audio recording with custom high-quality settings
      const { recording } = await Audio.Recording.createAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });
      recordingRef.current = recording;

      // Start waveform animation with REAL audio levels
      const updateWaveform = async () => {
        if (recordingRef.current) {
          try {
            const status = await recordingRef.current.getStatusAsync();
            if (status.isRecording && status.metering !== undefined) {
              // metering is in decibels (typically -160 to 0)
              // Normalize to 0-1 range for display
              const db = status.metering;
              const normalizedLevel = Math.max(0, Math.min(1, (db + 60) / 60));
              
              setWaveformAmplitudes((prev) => {
                const next = prev.length >= 40 ? prev.slice(1) : [...prev];
                // Add some smoothing and minimum height
                const smoothedLevel = normalizedLevel * 0.5 + 0.1;
                next.push(smoothedLevel);
                return next;
              });
              
              // Continue animation while recording
              animationRef.current = requestAnimationFrame(updateWaveform);
            }
          } catch (e) {
            // Recording might have stopped, that's ok
          }
        }
      };
      
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      updateWaveform();
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Failed to start recording. Please check permissions.");
      setRecordingState("idle");
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      setRecordingState("recorded");

      // Stop timer and animation
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      // Stop and get recording URI
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      
      if (uri) {
        // Store the URI properly
        const newUris = [...recordingUrisRef.current];
        newUris[currentRecording - 1] = uri;
        recordingUrisRef.current = newUris;
        console.log(`Recording ${currentRecording}/3 saved:`, uri);
        console.log(`Total recordings so far: ${newUris.filter(Boolean).length}`);
      }

      recordingRef.current = null;

      // Move to next recording or finish
      if (currentRecording < 3) {
        setTimeout(() => {
          setCurrentRecording(currentRecording + 1);
          setRecordingState("idle");
          setRecordingDuration(0);
          setWaveformAmplitudes([]);
        }, 800); // Slightly longer delay to show completion
      } else {
        console.log('All 3 recordings complete!');
        setAllRecordingsComplete(true);
        
        // If autoSaveName is provided, save automatically
        if (autoSaveName) {
          console.log('🤖 Auto-saving with name:', autoSaveName);
          setTimeout(() => {
            handleSaveWithName(autoSaveName);
          }, 1000); // Give user a moment to see completion
        }
      }
    } catch (err) {
      console.error("Failed to stop recording", err);
      Alert.alert("Error", "Failed to stop recording.");
      setRecordingState("idle");
    }
  };

  const togglePlayback = async () => {
    try {
      if (isPlaying) {
        // Stop playback
        if (soundRef.current) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        }
      } else {
        // Start playback - play the last recorded sample
        const lastRecordingUri = recordingUrisRef.current[currentRecording - 1];
        if (!lastRecordingUri) {
          Alert.alert("Error", "No recording available to play.");
          return;
        }

        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }

        // Set audio mode for playback - route through speaker at max volume
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false, // Use speaker on Android
          allowsRecordingIOS: false, // Not recording, just playing
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: lastRecordingUri },
          { 
            shouldPlay: true,
            volume: 1.0, // Maximum volume
            isMuted: false,
            rate: 1.0,
          }
        );
        soundRef.current = sound;
        
        // Set volume to maximum explicitly (some platforms need this)
        await sound.setVolumeAsync(1.0);
        
        // Ensure it's not muted
        await sound.setIsMutedAsync(false);
        
        // Double-check volume is at max
        try {
          await sound.setVolumeAsync(1.0);
        } catch (e) {
          console.log("Could not set volume:", e);
        }

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          }
        });

        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Failed to toggle playback", err);
      Alert.alert("Error", "Failed to play recording.");
      setIsPlaying(false);
    }
  };

  const uploadToBackend = async (label: string): Promise<string | null> => {
    try {
      setIsUploading(true);
      const backendUrl = getBackendUrl();
      const audioId = label.toLowerCase().replace(/\s+/g, '-');
      
      // Get userId from AsyncStorage
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        console.error('No userId found in storage');
        Alert.alert('Error', 'User not initialized. Please restart the app.');
        return null;
      }

      // Use the first recording for now (until backend supports multi-file upload)
      const firstRecordingUri = recordingUrisRef.current[0];
      
      console.log(`📤 Uploading custom sound: "${label}"`);

      // Create FormData with the first audio file
      const formData = new FormData();
      
      const fileExtension = firstRecordingUri.split('.').pop() || 'm4a';
      const fileName = `${audioId}-${Date.now()}.${fileExtension}`;
      
      formData.append('audioFile', {
        uri: firstRecordingUri,
        type: `audio/${fileExtension}`,
        name: fileName,
      } as any);
      
      // Add metadata
      formData.append('audioId', audioId);
      formData.append('userId', userId);

      console.log(`📤 Uploading to: ${backendUrl}/api/audio/upload`);

      // Upload to backend using multipart/form-data
      const response = await axios.post(
        `${backendUrl}/api/audio/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000, // 60 second timeout
        }
      );

      if (response.data.success) {
        console.log('✅ Audio uploaded and fingerprinted:', audioId);
        Alert.alert('Success', `"${label}" has been saved!`);
        return audioId;
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (err: any) {
      console.error('❌ Failed to upload audio:', err.message || err);
      Alert.alert(
        'Upload Failed',
        `Could not upload "${label}" to backend. Error: ${err.message || 'Unknown error'}`
      );
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveWithName = async (labelToUse: string) => {
    if (!labelToUse.trim()) {
      Alert.alert("Error", "Please enter a label for this sound.");
      return;
    }

    const validRecordings = recordingUrisRef.current.filter(Boolean);
    if (validRecordings.length < 3) {
      Alert.alert("Error", `Please complete all 3 recordings. You have ${validRecordings.length}/3.`);
      return;
    }

    try {
      // Upload to backend and create fingerprint
      const audioId = await uploadToBackend(labelToUse);
      
      if (audioId) {
        // Successfully uploaded and fingerprinted
        const firstRecordingUri = recordingUrisRef.current[0];
        await onSave(labelToUse, audioId, firstRecordingUri);
        onClose();
      } else {
        // Upload failed, but keep the local recording
        const fallbackId = `local-${Date.now()}`;
        const firstRecordingUri = recordingUrisRef.current[0];
        await onSave(labelToUse, fallbackId, firstRecordingUri);
        onClose();
      }
    } catch (err) {
      console.error("Failed to save:", err);
      Alert.alert("Error", "Failed to save recording. Please try again.");
    }
  };

  const handleSave = async () => {
    await handleSaveWithName(customLabel);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const infoText =
    recordingState === "idle"
      ? `Record sample ${currentRecording} of 3 - Play the sound you want to detect`
      : recordingState === "recording"
      ? `Recording sample ${currentRecording}/3...`
      : allRecordingsComplete
      ? "All 3 samples recorded! Enter a name to save."
      : `Sample ${currentRecording}/3 recorded! ${currentRecording < 3 ? 'Tap to record next sample.' : ''}`;

  const circleColor =
    recordingState === "idle"
      ? COLORS.detected
      : recordingState === "recording"
      ? COLORS.critical
      : COLORS.confirmed;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backBtn} hitSlop={10}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {/* Recording Card */}
      <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((num) => (
            <View
              key={num}
              style={[
                styles.progressCircle,
                recordingUrisRef.current[num - 1] && styles.progressCircleComplete,
                currentRecording === num && !allRecordingsComplete && styles.progressCircleActive,
              ]}
            >
              {recordingUrisRef.current[num - 1] ? (
                <Text style={styles.progressCheckmark}>✓</Text>
              ) : (
                <Text style={styles.progressText}>{num}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Record Button */}
        <View style={styles.center}>
          {recordingState === "idle" ? (
            <Pressable onPress={startRecording} style={[styles.bigCircle, { backgroundColor: circleColor }]}>
              <Mic size={40} color="white" />
            </Pressable>
          ) : recordingState === "recording" ? (
            <Animated.View style={{ transform: [{ scale: pulse }] }}>
              <Pressable onPress={stopRecording} style={[styles.bigCircle, { backgroundColor: circleColor }]}>
                <Square size={40} color="white" />
              </Pressable>
            </Animated.View>
          ) : (
            /* Recorded state - just show checkmark, no playback controls */
            <View style={[styles.bigCircle, { backgroundColor: circleColor }]}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          )}
        </View>

        {/* Status Text */}
        <Text style={styles.statusText}>
          {recordingState === "idle" && `Tap to record sample ${currentRecording}/3`}
          {recordingState === "recording" && `Recording sample ${currentRecording}/3...`}
          {recordingState === "recorded" && !allRecordingsComplete && `Sample ${currentRecording}/3 saved`}
          {recordingState === "recorded" && allRecordingsComplete && "All samples recorded!"}
        </Text>

        {/* Timer - only show during recording */}
        {recordingState === "recording" && (
          <Text style={styles.timerText}>{formatDuration(recordingDuration)}</Text>
        )}

        {/* Waveform - only show during recording */}
        {recordingState === "recording" && (
          <View style={styles.waveRow}>
            {waveformAmplitudes.map((amp, idx) => {
              const barHeight = Math.max(6, Math.round(amp * 60));
              return (
                <View
                  key={idx}
                  style={[
                    styles.waveBar,
                    { height: barHeight, backgroundColor: COLORS.detected },
                  ]}
                />
              );
            })}
          </View>
        )}
      </Animated.View>

      {/* Label Input - Only show after all 3 recordings AND if no autoSaveName */}
      {allRecordingsComplete && !autoSaveName && (
        <Animated.View style={[styles.inputBlock, { opacity: labelFade, transform: [{ translateY: labelFade.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }) }] }]}>
          <Text style={styles.labelPrompt}>Label this sound:</Text>
          <TextInput
            placeholder="e.g., Doorbell, laundry machine, dish washer"
            placeholderTextColor={COLORS.textSecondary}
            value={customLabel}
            onChangeText={setCustomLabel}
            style={[
              styles.input,
              { borderColor: customLabel ? COLORS.detected : "transparent" },
            ]}
            autoFocus
          />
        </Animated.View>
      )}

      {/* Info Note */}
      <Text style={styles.infoText}>{infoText}</Text>

      <View style={{ flex: 1 }} />

      {/* Action Buttons - Fixed at bottom - Only show after all 3 recordings AND if no autoSaveName */}
      {allRecordingsComplete && !autoSaveName && (
        <Animated.View style={[styles.bottomButtonContainer, { opacity: saveFade }]}>
          <Pressable
            onPress={handleSave}
            disabled={!customLabel || isUploading}
            style={[
              styles.primaryBtn,
              {
                backgroundColor: customLabel && !isUploading ? COLORS.primary : COLORS.textSecondary,
                opacity: customLabel && !isUploading ? 1 : 0.5,
              },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {isUploading ? "Uploading..." : "Save chime"}
            </Text>
          </Pressable>

          {/* <View style={styles.actionButtonsRow}>
            <Pressable
              onPress={() => {
                // Try again - reset to idle state
                setRecordingState("idle");
                setRecordingDuration(0);
                setCustomLabel("");
                setIsPlaying(false);
                setWaveformAmplitudes([]);
                recordingUriRef.current = null;
                if (soundRef.current) {
                  soundRef.current.unloadAsync().catch(console.error);
                  soundRef.current = null;
                }
                if (recordingRef.current) {
                  recordingRef.current.stopAndUnloadAsync().catch(console.error);
                  recordingRef.current = null;
                }
              }}
              style={[styles.secondaryBtn, styles.tryAgainBtn]}
              disabled={isUploading}
            >
              <Text style={styles.secondaryBtnText}>Try again</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                // Delete and go back
                Alert.alert(
                  "Delete Recording?",
                  "Are you sure you want to delete this recording?",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => {
                        // Clean up audio files
                        if (recordingUriRef.current) {
                          FileSystem.deleteAsync(recordingUriRef.current, { idempotent: true }).catch(console.error);
                        }
                        if (soundRef.current) {
                          soundRef.current.unloadAsync().catch(console.error);
                          soundRef.current = null;
                        }
                        if (recordingRef.current) {
                          recordingRef.current.stopAndUnloadAsync().catch(console.error);
                          recordingRef.current = null;
                        }
                        // Go back to home
                        onClose();
                      },
                    },
                  ]
                );
              }}
              style={[styles.secondaryBtn, styles.deleteBtn]}
              disabled={isUploading}
            >
              <Text style={[styles.secondaryBtnText, { color: COLORS.critical }]}>Delete</Text>
            </Pressable>
          </View> */}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 24 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backBtn: { marginRight: 10, padding: 6, borderRadius: 999 },
  headerTitle: { fontSize: 22, fontWeight: "600", color: COLORS.textPrimary },

  card: { 
    backgroundColor: COLORS.card, 
    borderRadius: 24, 
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  center: { alignItems: "center", justifyContent: "center", marginBottom: 16 },
  playbackControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  bigCircle: {
    width: 96,
    height: 96,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    fontSize: 48,
    color: "white",
    fontWeight: "700",
  },
  refreshBtn: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  statusText: { textAlign: "center", color: COLORS.textPrimary, marginTop: 6, fontSize: 15 },
  timerText: {
    textAlign: "center",
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 12,
  },

  waveRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: 70,
    marginTop: 6,
  },
  waveBar: {
    width: 4,
    borderRadius: 999,
    opacity: 0.85,
    marginHorizontal: 2,
  },

  inputBlock: { marginTop: 18, marginBottom: 10 },
  labelPrompt: { color: COLORS.textPrimary, marginBottom: 10, fontSize: 15 },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: COLORS.textPrimary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },

  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  progressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: "center",
    alignItems: "center",
  },
  progressCircleActive: {
    borderColor: COLORS.detected,
    borderWidth: 3,
  },
  progressCircleComplete: {
    backgroundColor: COLORS.confirmed,
    borderColor: COLORS.confirmed,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  progressCheckmark: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },

  infoText: {
    marginTop: 4,
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 13,
  },

  bottomButtonContainer: {
  },

  primaryBtn: { 
    borderRadius: 16, 
    paddingVertical: 16, 
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "700", fontSize: 16 },

  actionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tryAgainBtn: {
    backgroundColor: COLORS.card,
  },
  deleteBtn: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.critical,
  },
  secondaryBtnText: { color: COLORS.textPrimary, fontWeight: "600", fontSize: 16 },
});
