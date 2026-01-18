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
import { Mic, Square, ArrowLeft, Play, Pause } from "lucide-react-native";
import axios from "axios";
import Constants from "expo-constants";

interface TeachSoundScreenProps {
  onClose: () => void;
  onSave: (label: string, audioData: string) => void;
}

type RecordingState = "idle" | "recording" | "recorded";

const COLORS = {
  bg: "#0B0B0F",
  card: "#15151C",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A0AA",
  primary: "#6D5EF5",
  detected: "#3B82F6",
  confirmed: "#22C55E",
  critical: "#EF4444",
};

// Get backend URL - adjust this to match your backend
const getBackendUrl = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:3000`;
  }
  return "http://localhost:3000";
};

export default function TeachSoundScreen({ onClose, onSave }: TeachSoundScreenProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [customLabel, setCustomLabel] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformAmplitudes, setWaveformAmplitudes] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationRef = useRef<number | null>(null);
  const recordingUriRef = useRef<string | null>(null);

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
    // Fade in label + save button when recorded
    const shouldShow = recordingState === "recorded";
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
  }, [recordingState, labelFade, saveFade]);

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
      setCustomLabel("");
      setIsPlaying(false);
      setWaveformAmplitudes([]);
      recordingUriRef.current = null;

      // Start timer
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 0.1);
      }, 100);

      // Start waveform animation
      const animateWaveform = () => {
        setWaveformAmplitudes((prev) => {
          const next = prev.length >= 40 ? prev.slice(1) : [...prev];
          next.push(Math.random() * 0.5 + 0.3);
          return next;
        });
        animationRef.current = requestAnimationFrame(animateWaveform);
      };
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animateWaveform();

      // Start audio recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
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
      recordingUriRef.current = uri || null;

      // Freeze waveform at current state
      if (uri) {
        console.log("Recording saved to:", uri);
      }

      recordingRef.current = null;
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
        // Start playback
        if (!recordingUriRef.current) {
          Alert.alert("Error", "No recording available to play.");
          return;
        }

        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: recordingUriRef.current },
          { shouldPlay: true }
        );
        soundRef.current = sound;

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

  const uploadToBackend = async (audioUri: string, label: string): Promise<string | null> => {
    try {
      setIsUploading(true);
      const backendUrl = getBackendUrl();
      const audioId = `audio-${Date.now()}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload to backend
      const response = await axios.post(
        `${backendUrl}/api/audio/upload`,
        {
          audioId,
          label,
          audioData: base64,
          format: "m4a", // or detect from URI
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      if (response.data.success) {
        console.log("Audio uploaded successfully:", audioId);
        return audioId;
      } else {
        throw new Error(response.data.error || "Upload failed");
      }
    } catch (err: any) {
      console.error("Failed to upload audio:", err);
      // Don't show alert here - let the user know it's saved locally
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!customLabel || recordingState !== "recorded") return;

    if (!recordingUriRef.current) {
      Alert.alert("Error", "No recording available to save.");
      return;
    }

    try {
      // Try to upload to backend
      const audioId = await uploadToBackend(recordingUriRef.current, customLabel);
      
      // Use backend audioId if available, otherwise generate local ID
      const finalAudioId = audioId || `audio-${Date.now()}`;
      
      onSave(customLabel, finalAudioId);
      onClose();
    } catch (err) {
      console.error("Failed to save:", err);
      Alert.alert("Error", "Failed to save recording. Please try again.");
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const infoText =
    recordingState === "idle"
      ? "Record a 3-5 second sample of the sound you want to detect"
      : recordingState === "recording"
      ? "Make the sound you want to teach"
      : "Audio is stored locally for pattern matching";

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
        <Text style={styles.headerTitle}>Teach a new sound</Text>
      </View>

      {/* Recording Card */}
      <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
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
            <Pressable onPress={togglePlayback} style={[styles.bigCircle, { backgroundColor: circleColor }]}>
              {isPlaying ? <Pause size={40} color="white" /> : <Play size={40} color="white" />}
            </Pressable>
          )}
        </View>

        {/* Status Text */}
        <Text style={styles.statusText}>
          {recordingState === "idle" && "Tap to record a sound"}
          {recordingState === "recording" && "Recording..."}
          {recordingState === "recorded" && (isPlaying ? "Playing..." : "Recording saved")}
        </Text>

        {/* Timer */}
        {(recordingState === "recording" || recordingState === "recorded") && (
          <Text style={styles.timerText}>{formatDuration(recordingDuration)}</Text>
        )}

        {/* Waveform */}
        {(recordingState === "recording" || recordingState === "recorded") && (
          <View style={styles.waveRow}>
            {waveformAmplitudes.map((amp, idx) => {
              const barHeight = Math.max(6, Math.round(amp * 60));
              const barColor =
                recordingState === "recorded"
                  ? isPlaying
                    ? COLORS.confirmed
                    : COLORS.detected
                  : COLORS.detected;

              return (
                <View
                  key={idx}
                  style={[
                    styles.waveBar,
                    { height: barHeight, backgroundColor: barColor },
                  ]}
                />
              );
            })}
          </View>
        )}
      </Animated.View>

      {/* Label Input */}
      {recordingState === "recorded" && (
        <Animated.View style={[styles.inputBlock, { opacity: labelFade, transform: [{ translateY: labelFade.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }) }] }]}>
          <Text style={styles.labelPrompt}>Label this sound:</Text>
          <TextInput
            placeholder="e.g., Door knock, Microwave beep, Dog bark"
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

      {/* Save Button */}
      {recordingState === "recorded" && (
        <Animated.View style={{ opacity: saveFade }}>
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
              {isUploading ? "Uploading..." : "Save sound"}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setRecordingState("idle");
              setRecordingDuration(0);
              setCustomLabel("");
              setIsPlaying(false);
              setWaveformAmplitudes([]);
              recordingUriRef.current = null;
              if (soundRef.current) {
                soundRef.current.unloadAsync().catch(console.error);
              }
            }}
            style={styles.secondaryBtn}
            disabled={isUploading}
          >
            <Text style={styles.secondaryBtnText}>Record again</Text>
          </Pressable>
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

  card: { backgroundColor: COLORS.card, borderRadius: 24, padding: 20 },
  center: { alignItems: "center", justifyContent: "center", marginBottom: 16 },
  bigCircle: {
    width: 96,
    height: 96,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  statusText: { textAlign: "center", color: COLORS.textPrimary, marginTop: 6 },
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
  labelPrompt: { color: COLORS.textPrimary, marginBottom: 10 },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: COLORS.textPrimary,
  },

  infoText: {
    marginTop: 18,
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 12,
  },

  primaryBtn: { borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  primaryBtnText: { color: "white", fontWeight: "600", fontSize: 16 },

  secondaryBtn: {
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: COLORS.card,
  },
  secondaryBtnText: { color: COLORS.textPrimary, fontWeight: "600", fontSize: 16 },
});
