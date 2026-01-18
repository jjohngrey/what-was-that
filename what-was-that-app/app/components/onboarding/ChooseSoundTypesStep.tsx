import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Switch, ScrollView, Modal } from "react-native";
import { Mic } from "lucide-react-native";
import { OnboardingData } from "../../../types/onboarding";
import TeachSoundScreen from "../TeachSoundScreen";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ChooseSoundTypesStepProps {
  soundTypes: OnboardingData["soundTypes"];
  onSoundTypesChange: (soundTypes: OnboardingData["soundTypes"]) => void;
  recordedSounds?: {
    doorbell?: { audioId: string; audioUri: string };
    babyCrying?: { audioId: string; audioUri: string };
  };
  onRecordedSoundsChange?: (sounds: {
    doorbell?: { audioId: string; audioUri: string };
    babyCrying?: { audioId: string; audioUri: string };
  }) => void;
  onNext: () => void;
  onBack?: () => void;
  showBack?: boolean;
}

type RecordingType = "doorbell" | "babyCrying" | null;

export default function ChooseSoundTypesStep({
  soundTypes,
  onSoundTypesChange,
  recordedSounds = {},
  onRecordedSoundsChange,
  onNext,
  onBack,
  showBack,
}: ChooseSoundTypesStepProps) {
  const [showRecorder, setShowRecorder] = useState(false);
  const [recordingFor, setRecordingFor] = useState<RecordingType>(null);

  // Debug: Log when recordedSounds prop changes
  useEffect(() => {
    console.log('🔍 ChooseSoundTypesStep: recordedSounds prop changed:', JSON.stringify(recordedSounds, null, 2));
  }, [recordedSounds]);

  const toggleSound = (key: keyof OnboardingData["soundTypes"]) => {
    if (key === "smokeAlarm") return; // Locked, always on
    onSoundTypesChange({
      ...soundTypes,
      [key]: !soundTypes[key],
    });
  };

  const handleStartRecording = (type: RecordingType) => {
    setRecordingFor(type);
    setShowRecorder(true);
  };

  const handleSaveRecording = async (soundName: string, audioId: string, audioUri: string) => {
    console.log('🎙️ handleSaveRecording called');
    console.log('  soundName:', soundName);
    console.log('  audioId:', audioId);
    console.log('  audioUri:', audioUri);
    console.log('  recordingFor:', recordingFor);
    
    try {
      // Copy the audio file to a permanent location
      const permanentDir = `${FileSystem.documentDirectory}audio/`;
      
      const dirInfo = await FileSystem.getInfoAsync(permanentDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(permanentDir, { intermediates: true });
        console.log('📁 Created audio directory:', permanentDir);
      }
      
      const fileExtension = audioUri.split('.').pop() || 'm4a';
      const permanentUri = `${permanentDir}${audioId}-${Date.now()}.${fileExtension}`;
      
      console.log('📁 Copying from:', audioUri);
      console.log('📁 Copying to:', permanentUri);
      
      await FileSystem.copyAsync({
        from: audioUri,
        to: permanentUri,
      });
      
      console.log(`✅ File copied successfully`);
      
      // Verify the file exists
      const fileInfo = await FileSystem.getInfoAsync(permanentUri);
      console.log('🔍 Verifying copied file exists:', fileInfo.exists);
      
      // Save audioUri to AsyncStorage so it can be retrieved when fetching from backend
      const storageKey = `audioUri_${audioId}`;
      await AsyncStorage.setItem(storageKey, permanentUri);
      console.log('💾 Saved to AsyncStorage: key=', storageKey, ', value=', permanentUri);
      
      // Verify it was saved
      const savedUri = await AsyncStorage.getItem(storageKey);
      console.log('✅ Verified AsyncStorage:', savedUri);
      
      // Save the recording
      if (onRecordedSoundsChange && recordingFor) {
        const updatedSounds = {
          ...recordedSounds,
          [recordingFor]: { audioId, audioUri: permanentUri },
        };
        console.log('💾 Calling onRecordedSoundsChange with:', JSON.stringify(updatedSounds, null, 2));
        onRecordedSoundsChange(updatedSounds);
      } else {
        console.log('⚠️ onRecordedSoundsChange or recordingFor is null/undefined');
        console.log('  onRecordedSoundsChange:', onRecordedSoundsChange);
        console.log('  recordingFor:', recordingFor);
      }
      
      setShowRecorder(false);
      setRecordingFor(null);
    } catch (error) {
      console.error('❌ Failed to save audio file:', error);
      // Still save even if copy fails
      if (onRecordedSoundsChange && recordingFor) {
        onRecordedSoundsChange({
          ...recordedSounds,
          [recordingFor]: { audioId, audioUri },
        });
      }
      setShowRecorder(false);
      setRecordingFor(null);
    }
  };

  const getRecordingTitle = () => {
    if (recordingFor === "doorbell") return "Record your doorbell";
    return "Record a chime";
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={styles.title}>Set Up Sound Detection</Text>
        <Text style={styles.subtitle}>
          Configure which sounds you want to be alerted about.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Alerts (Always Active)</Text>
          <Text style={styles.helperText}>
            These critical alerts use pre-trained models to detect common emergency sounds.
          </Text>

          <View style={styles.soundItem}>
            <View style={styles.soundItemLeft}>
              <Text style={styles.soundLabel}>Smoke/Fire Alarm</Text>
              <Text style={styles.lockedText}>Always ON (locked)</Text>
            </View>
            <View style={[styles.switchContainer, { opacity: 0.5 }]}>
              <Switch
                value={true}
                disabled={true}
                trackColor={{ false: "#2A2A35", true: "#6D5EF5" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.soundItem}>
            <View style={styles.soundItemLeft}>
              <Text style={styles.soundLabel}>Glass Breaking</Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={soundTypes.glassBreaking}
                onValueChange={() => toggleSound("glassBreaking")}
                trackColor={{ false: "#2A2A35", true: "#6D5EF5" }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Alerts (Record Your Own)</Text>
          <Text style={styles.helperText}>
            Everyone's doorbell sounds different - record yours for accurate detection.
          </Text>

          <View style={styles.soundItem}>
            <View style={styles.soundItemLeft}>
              <Text style={styles.soundLabel}>Doorbell</Text>
              {recordedSounds.doorbell ? (
                <Text style={styles.recordedText}>✓ Recorded</Text>
              ) : (
                <Text style={styles.notRecordedText}>Not recorded</Text>
              )}
            </View>
            <Pressable 
              onPress={() => handleStartRecording("doorbell")}
              style={({ pressed }) => [
                styles.recordBtn,
                { opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Mic size={18} color={recordedSounds.doorbell ? "#6D5EF5" : "#fff"} />
              <Text style={styles.recordBtnText}>
                {recordedSounds.doorbell ? "Re-record" : "Record"}
              </Text>
            </Pressable>
          </View>
          
          <View style={styles.tipBox}>
            <Text style={styles.tipText}>
              💡 You can add more custom sounds (like washing machine, baby crying, or any other alert) in the Sounds tab later!
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Pressable
          onPress={onNext}
          style={({ pressed }) => [
            styles.continueBtn,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </Pressable>
      </View>

      <Modal
        visible={showRecorder}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setShowRecorder(false);
          setRecordingFor(null);
        }}
      >
        <TeachSoundScreen
          onClose={() => {
            setShowRecorder(false);
            setRecordingFor(null);
          }}
          onSave={handleSaveRecording}
          title={getRecordingTitle()}
          autoSaveName="Doorbell"
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#0B0B0F",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#A0A0AA",
    marginBottom: 32,
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  helperText: {
    fontSize: 14,
    color: "#A0A0AA",
    marginBottom: 16,
    lineHeight: 20,
  },
  soundItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#15151C",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  soundItemLeft: {
    flex: 1,
  },
  soundLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  lockedText: {
    fontSize: 12,
    color: "#A0A0AA",
    fontStyle: "italic",
  },
  switchContainer: {
    marginLeft: 16,
  },
  recordBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#6D5EF5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  recordBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  recordedText: {
    fontSize: 12,
    color: "#22C55E",
    fontWeight: "600",
  },
  notRecordedText: {
    fontSize: 12,
    color: "#A0A0AA",
  },
  tipBox: {
    backgroundColor: "#1E1E27",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#6D5EF5",
  },
  tipText: {
    fontSize: 14,
    color: "#A0A0AA",
    lineHeight: 20,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: "#0B0B0F",
    gap: 12,
  },
  continueBtn: {
    backgroundColor: "#6D5EF5",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});

