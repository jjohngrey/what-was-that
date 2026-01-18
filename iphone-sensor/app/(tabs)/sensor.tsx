import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { ExpoPlayAudioStream } from '@mykin-ai/expo-audio-stream';
import axios from 'axios';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { CONFIG, getBackendEndpoint } from '@/config';

// Configuration loaded from config.ts
const BACKEND_URL = CONFIG.BACKEND_URL;
const USER_ID = CONFIG.USER_ID;

// Audio streaming configuration
const SAMPLE_RATE = 16000; // 16kHz
const BUFFER_DURATION_MS = 3000; // 3 seconds rolling buffer
const TRIGGER_THRESHOLD = 0.3; // Sound level threshold (0.0 - 1.0)
const COOLDOWN_MS = 1500; // 1.5 seconds between uploads
const CHUNKS_PER_BUFFER = Math.ceil((SAMPLE_RATE * BUFFER_DURATION_MS) / 1000);

interface MatchResult {
  success: boolean;
  match: string | null;
  confidence: number;
  confidencePercent: string;
  allScores?: Array<{
    audioId: string;
    score: number;
    userId: string;
  }>;
}

interface AudioChunk {
  data: Float32Array;
  timestamp: number;
}

export default function SensorScreen() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [triggersCount, setTriggersCount] = useState(0);
  const [lastTriggerTime, setLastTriggerTime] = useState<Date | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>(new Array(50).fill(0));
  
  // Rolling buffer to store last 3 seconds of audio
  const audioBuffer = useRef<Float32Array[]>([]);
  const lastUploadTime = useRef<number>(0);
  const streamingSubscription = useRef<any>(null);

  useEffect(() => {
    // Setup audio permissions on mount
    setupAudioPermissions();

    return () => {
      // Cleanup on unmount
      stopStreaming();
    };
  }, []);

  const setupAudioPermissions = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  };

  const startStreaming = async () => {
    try {
      console.log('🎤 Starting audio stream...');
      
      // Request microphone permission
      const { granted } = await ExpoPlayAudioStream.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Required', 'Please grant microphone permission to listen for sounds');
        return;
      }

      // Start streaming with configuration
      const { recordingResult } = await ExpoPlayAudioStream.startRecording({
        sampleRate: SAMPLE_RATE,
        channels: 1,
        encoding: 'pcm_16bit',
        interval: 100, // Emit data every 100ms
      });

      // Subscribe to audio events
      const subscription = ExpoPlayAudioStream.subscribeToAudioEvents(async (event: any) => {
        processAudioChunk(event);
      });

      setIsStreaming(true);
      audioBuffer.current = [];
      streamingSubscription.current = subscription;
      
      console.log('✅ Audio streaming started:', recordingResult);

    } catch (error) {
      console.error('❌ Failed to start streaming:', error);
      Alert.alert('Error', 'Failed to start audio streaming: ' + error);
    }
  };

  const stopStreaming = async () => {
    try {
      console.log('🛑 Stopping audio stream...');
      
      if (streamingSubscription.current) {
        streamingSubscription.current.remove();
        streamingSubscription.current = null;
      }

      await ExpoPlayAudioStream.stopRecording();
      setIsStreaming(false);
      audioBuffer.current = [];
      setCurrentLevel(0);
      setWaveformData(new Array(50).fill(0));
      console.log('✅ Audio streaming stopped');
      
    } catch (error) {
      console.error('Error stopping stream:', error);
    }
  };

  const processAudioChunk = (event: any) => {
    try {
      // Extract data from event
      const { data, soundLevel } = event;
      
      // Convert base64 PCM data to Float32Array
      const pcmData = base64ToFloat32Array(data);
      
      // Calculate RMS level if soundLevel is not provided
      let level = soundLevel;
      if (level === undefined || level === null) {
        // Calculate RMS (Root Mean Square) from audio data
        let sum = 0;
        for (let i = 0; i < pcmData.length; i++) {
          sum += pcmData[i] * pcmData[i];
        }
        const rms = Math.sqrt(sum / pcmData.length);
        level = Math.min(1.0, rms * 3); // Scale and cap at 1.0
      }
      
      setCurrentLevel(level);

      // Update waveform visualization
      setWaveformData(prev => [...prev.slice(1), level]);
      
      // Add chunk to rolling buffer
      audioBuffer.current.push(pcmData);

      // Calculate max buffer size for 3 seconds
      const maxChunks = Math.ceil((SAMPLE_RATE * BUFFER_DURATION_MS) / (pcmData.length * 1000));
      
      // Remove oldest chunks to maintain 3-second buffer
      while (audioBuffer.current.length > maxChunks) {
        audioBuffer.current.shift();
      }

      // Check if sound level exceeds threshold
      if (level > TRIGGER_THRESHOLD) {
        const now = Date.now();
        const timeSinceLastUpload = now - lastUploadTime.current;

        // Check cooldown period
        if (timeSinceLastUpload >= COOLDOWN_MS) {
          console.log(`🔊 Sound detected! Level: ${level.toFixed(3)}, Threshold: ${TRIGGER_THRESHOLD}`);
          triggerUpload();
        }
      }

    } catch (error) {
      console.error('Error processing audio chunk:', error);
    }
  };

  const calculateRMS = (samples: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  };

  const base64ToFloat32Array = (base64: string): Float32Array => {
    // Decode base64 to binary string
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert bytes to 16-bit PCM samples
    const int16Array = new Int16Array(bytes.buffer);
    
    // Normalize to float32 (-1.0 to 1.0)
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    return float32Array;
  };

  const triggerUpload = async () => {
    try {
      lastUploadTime.current = Date.now();
      setTriggersCount(prev => prev + 1);
      setLastTriggerTime(new Date());

      console.log('📤 Triggered! Capturing last 3 seconds of audio...');

      // Concatenate all chunks in buffer to get last 3 seconds
      const totalSamples = audioBuffer.current.reduce((sum, chunk) => sum + chunk.length, 0);
      const completeBuffer = new Float32Array(totalSamples);
      
      let offset = 0;
      for (const chunk of audioBuffer.current) {
        completeBuffer.set(chunk, offset);
        offset += chunk.length;
      }

      console.log(`📊 Captured ${totalSamples} samples (${(totalSamples / SAMPLE_RATE).toFixed(2)}s)`);

      // Convert to WAV and upload
      await convertAndUpload(completeBuffer);

    } catch (error) {
      console.error('❌ Error during trigger upload:', error);
    }
  };

  const convertAndUpload = async (pcmData: Float32Array) => {
    try {
      setIsProcessing(true);

      // Convert Float32Array to 16-bit PCM
      const int16Array = new Int16Array(pcmData.length);
      for (let i = 0; i < pcmData.length; i++) {
        const s = Math.max(-1, Math.min(1, pcmData[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Create WAV file
      const wavBuffer = createWAVFile(int16Array, SAMPLE_RATE);
      
      // Convert to base64
      const base64Audio = arrayBufferToBase64(wavBuffer);

      // Save to file system
      const fileName = `trigger_${Date.now()}.wav`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log(`💾 Saved audio to: ${fileUri}`);

      // Upload to backend
      await sendToBackend(fileUri);

    } catch (error) {
      console.error('❌ Error converting and uploading:', error);
      Alert.alert('Error', 'Failed to process audio: ' + error);
    } finally {
      setIsProcessing(false);
    }
  };

  const createWAVFile = (samples: Int16Array, sampleRate: number): ArrayBuffer => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // WAV file header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM format
    view.setUint16(20, 1, true); // Audio format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    // Write PCM samples
    const offset = 44;
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(offset + i * 2, samples[i], true);
    }

    return buffer;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const sendToBackend = async (audioUri: string) => {
    try {
      console.log('📤 Uploading to backend...');
      console.log('Audio URI:', audioUri);

      // Read the audio file
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      console.log('File info:', fileInfo);

      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist');
      }

      // Create form data
      const formData = new FormData();
      
      // Get file extension
      const uriParts = audioUri.split('.');
      const fileExtension = uriParts[uriParts.length - 1];
      
      const audioFile = {
        uri: audioUri,
        type: `audio/${fileExtension}`,
        name: `trigger_${Date.now()}.${fileExtension}`
      } as any;

      formData.append('audioFile', audioFile);
      formData.append('userId', USER_ID);
      formData.append('timestamp', Date.now().toString());

      // Upload to the simple trigger endpoint (no fingerprinting)
      const response = await axios.post(
        getBackendEndpoint('/api/audio/trigger'),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000,
        }
      );

      console.log('✅ Trigger saved:', response.data);

      // Now call the match API with the saved file path
      const savedFilePath = `./recorded_fingerprints/${response.data.filename}`;
      console.log('🎯 Matching against fingerprints...');
      
      const matchResponse = await axios.post(
        getBackendEndpoint('/api/audio/match'),
        {
          audioFilePath: savedFilePath,
          threshold: CONFIG.AUDIO.MATCH_THRESHOLD,
          userId: USER_ID,
          matchOwnOnly: CONFIG.AUDIO.MATCH_OWN_ONLY
        },
        {
          timeout: 30000,
        }
      );

      console.log('✅ Match response:', matchResponse.data);
      setMatchResult(matchResponse.data);

      if (matchResponse.data.match) {
        console.log(`🎵 MATCH FOUND: ${matchResponse.data.match} (${matchResponse.data.confidencePercent})`);
      } else {
        console.log('❌ No match found');
      }

    } catch (err: any) {
      console.error('❌ Error sending to backend:', err);
      let errorMessage = 'Failed to process audio';
      
      if (err.response) {
        console.error('Server response:', err.response.data);
        errorMessage = err.response.data.error || err.response.data.details || errorMessage;
      } else if (err.request) {
        errorMessage = 'Could not connect to server.';
      } else {
        errorMessage = err.message;
      }
      
      console.error('Error message:', errorMessage);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>🎧 Auto Sound Detector</ThemedText>
          <ThemedText style={styles.subtitle}>
            Continuously monitors audio and triggers on loud sounds
          </ThemedText>
        </View>

        <View style={styles.infoCard}>
          <ThemedText style={styles.infoTitle}>⚙️ Configuration:</ThemedText>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Backend:</ThemedText>
            <ThemedText style={styles.infoValue}>{BACKEND_URL}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Buffer:</ThemedText>
            <ThemedText style={styles.infoValue}>{BUFFER_DURATION_MS / 1000}s rolling</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Threshold:</ThemedText>
            <ThemedText style={styles.infoValue}>{(TRIGGER_THRESHOLD * 100).toFixed(0)}%</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Cooldown:</ThemedText>
            <ThemedText style={styles.infoValue}>{COOLDOWN_MS / 1000}s</ThemedText>
          </View>
        </View>

        <View style={styles.controlsContainer}>
          {!isStreaming ? (
            <TouchableOpacity
              style={[styles.button, styles.startButton]}
              onPress={startStreaming}
              disabled={isProcessing}
            >
              <Text style={styles.buttonText}>▶️ Start Listening</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={stopStreaming}
            >
              <Text style={styles.buttonText}>⏹️ Stop Listening</Text>
            </TouchableOpacity>
          )}
        </View>

        {isStreaming && (
          <View style={styles.statusCard}>
            <View style={styles.streamingIndicator}>
              <View style={styles.recordingDot} />
              <ThemedText style={styles.streamingText}>Listening...</ThemedText>
            </View>

            <View style={styles.levelContainer}>
              <ThemedText style={styles.levelLabel}>Audio Level:</ThemedText>
              <View style={styles.levelBarContainer}>
                <View 
                  style={[
                    styles.levelBar, 
                    { 
                      width: `${Math.min(100, currentLevel * 100)}%`,
                      backgroundColor: currentLevel > TRIGGER_THRESHOLD ? '#FF3B30' : '#34C759'
                    }
                  ]} 
                />
              </View>
              <ThemedText style={styles.levelValue}>
                {(currentLevel * 100).toFixed(1)}%
              </ThemedText>
            </View>

            <View style={styles.waveformContainer}>
              <ThemedText style={styles.waveformLabel}>Waveform:</ThemedText>
              <View style={styles.waveform}>
                {waveformData.map((value, index) => (
                  <View
                    key={index}
                    style={[
                      styles.waveformBar,
                      {
                        height: `${Math.max(2, value * 100)}%`,
                        backgroundColor: value > TRIGGER_THRESHOLD ? '#FF3B30' : '#34C759',
                        opacity: 0.5 + (value * 0.5)
                      }
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>{triggersCount}</ThemedText>
                <ThemedText style={styles.statLabel}>Triggers</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>
                  {audioBuffer.current.length}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Buffer Chunks</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>
                  {lastTriggerTime ? lastTriggerTime.toLocaleTimeString() : '--:--:--'}
                </ThemedText>
                <ThemedText style={styles.statLabel}>Last Trigger</ThemedText>
              </View>
            </View>
          </View>
        )}

        {isProcessing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <ThemedText style={styles.processingText}>
              Uploading and analyzing...
            </ThemedText>
          </View>
        )}

        {matchResult && (
          <View style={[
            styles.resultCard,
            matchResult.match ? styles.resultSuccess : styles.resultNoMatch
          ]}>
            <ThemedText style={styles.resultTitle}>
              {matchResult.match ? '🎵 Match Found!' : '🔍 No Match'}
            </ThemedText>
            
            {matchResult.match && (
              <>
                <View style={styles.resultItem}>
                  <ThemedText style={styles.resultLabel}>Sound:</ThemedText>
                  <ThemedText style={styles.resultValue}>{matchResult.match}</ThemedText>
                </View>
                <View style={styles.resultItem}>
                  <ThemedText style={styles.resultLabel}>Confidence:</ThemedText>
                  <ThemedText style={styles.resultValue}>
                    {matchResult.confidencePercent}
                  </ThemedText>
                </View>
              </>
            )}

            {!matchResult.match && (
              <ThemedText style={styles.resultMessage}>
                No matching fingerprint found.
              </ThemedText>
            )}

            {matchResult.allScores && matchResult.allScores.length > 0 && (
              <View style={styles.scoresContainer}>
                <ThemedText style={styles.scoresTitle}>Top Matches:</ThemedText>
                {matchResult.allScores.slice(0, 3).map((score, index) => (
                  <View key={index} style={styles.scoreItem}>
                    <ThemedText style={styles.scoreName}>
                      {index + 1}. {score.audioId}
                    </ThemedText>
                    <ThemedText style={styles.scoreValue}>
                      {(score.score * 100).toFixed(1)}%
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            💡 How it works:{'\n'}
            • Continuously records audio in a 3s rolling buffer{'\n'}
            • Triggers when sound exceeds {(TRIGGER_THRESHOLD * 100).toFixed(0)}% threshold{'\n'}
            • Captures and uploads the last 3 seconds{'\n'}
            • {COOLDOWN_MS / 1000}s cooldown between triggers
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#007AFF20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: 'bold',
  },
  controlsContainer: {
    marginBottom: 20,
  },
  button: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: '#34C759',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: '#34C75920',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  streamingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingVertical: 12,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginRight: 12,
  },
  streamingText: {
    fontSize: 18,
    fontWeight: '600',
  },
  levelContainer: {
    marginBottom: 20,
  },
  levelLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  levelBarContainer: {
    height: 24,
    backgroundColor: '#00000010',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  levelBar: {
    height: '100%',
    borderRadius: 12,
  },
  levelValue: {
    fontSize: 12,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  waveformContainer: {
    marginBottom: 20,
  },
  waveformLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    backgroundColor: '#00000010',
    borderRadius: 12,
    padding: 4,
    gap: 1,
  },
  waveformBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#00000020',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  processingContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#007AFF20',
    borderRadius: 12,
    marginBottom: 20,
  },
  processingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  resultSuccess: {
    backgroundColor: '#34C75930',
  },
  resultNoMatch: {
    backgroundColor: '#FF9F0A20',
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  scoresContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#00000020',
  },
  scoresTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  scoreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  scoreName: {
    fontSize: 14,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#5856D620',
    borderRadius: 12,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 20,
  },
});

