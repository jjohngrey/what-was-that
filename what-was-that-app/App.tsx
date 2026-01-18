import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

import HomeScreen from "./app/components/HomeScreen";
import SavedSoundsScreen from "./app/components/SavedSoundsScreen";
import TeachSoundScreen from "./app/components/TeachSoundScreen";
import EventHistoryScreen from "./app/components/EventHistoryScreen";
import SettingsScreen from "./app/components/SettingsScreen";
import BottomNav from "./app/components/BottomNav";
import OnboardingFlow from "./app/components/onboarding/OnboardingFlow";
import { useNotifications } from "./hooks/use-notifications";
import { checkOnboardingComplete, loadOnboardingData } from "./utils/onboarding-storage";

export type Screen = "home" | "sounds" | "history" | "settings" | "teach";

export interface SavedSound {
  id: string;
  label: string;
  dateAdded: string;
  timesDetected: number;
  enabled: boolean;
  audioData: string;
  audioUri?: string; // Local URI for playback
}

// Get backend URL
const PRODUCTION_BACKEND = 'http://155.138.215.227:3000'; // Vultr production backend

const getBackendUrl = () => {
  if (PRODUCTION_BACKEND) {
    return PRODUCTION_BACKEND;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:3000`;
  }
  return "http://localhost:3000";
};

export default function App() {
  // Setup push notifications
  const { expoPushToken, userId } = useNotifications();
  
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [savedSounds, setSavedSounds] = useState<SavedSound[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  // Debug logging for state changes
  useEffect(() => {
    console.log('🔄 App state changed:', { showOnboarding, isCheckingOnboarding });
  }, [showOnboarding, isCheckingOnboarding]);

  // Check onboarding status on mount
  useEffect(() => {
    let isMounted = true;
    const checkOnboarding = async () => {
      console.log('🔍 Checking onboarding status...');
      const isComplete = await checkOnboardingComplete();
      console.log('✅ Onboarding complete:', isComplete);
      
      // If onboarding is complete, load recorded sounds from onboarding data
      if (isComplete) {
        const onboardingData = await loadOnboardingData();
        console.log('📋 Onboarding data loaded:', JSON.stringify(onboardingData, null, 2));
        
        if (onboardingData?.recordedSounds) {
          const recordedSounds = [];
          
          // Load doorbell if recorded
          if (onboardingData.recordedSounds.doorbell) {
            const { audioId, audioUri } = onboardingData.recordedSounds.doorbell;
            console.log(`📥 Loading doorbell: audioId=${audioId}, audioUri=${audioUri}`);
            
            const key = `audioUri_${audioId}`;
            await AsyncStorage.setItem(key, audioUri);
            console.log(`💾 Saved to AsyncStorage: key=${key}, value=${audioUri}`);
            
            // Verify it was saved
            const savedUri = await AsyncStorage.getItem(key);
            console.log(`✅ Verified AsyncStorage: ${savedUri}`);
            
            recordedSounds.push({
              id: `onboarding-doorbell-${Date.now()}`,
              label: "Doorbell",
              dateAdded: "From onboarding",
              timesDetected: 0,
              enabled: true,
              audioData: audioId,
              audioUri,
            });
          }
          
          if (recordedSounds.length > 0) {
            console.log(`📥 Adding ${recordedSounds.length} sounds from onboarding:`, recordedSounds);
            setSavedSounds((prev) => [...recordedSounds, ...prev]);
          } else {
            console.log('⚠️ No recorded sounds found in onboarding data');
          }
        } else {
          console.log('⚠️ No recordedSounds in onboarding data');
        }
      }
      
      if (isMounted) {
        setShowOnboarding(!isComplete);
        setIsCheckingOnboarding(false);
      }
    };
    checkOnboarding();
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once

  const handleOnboardingComplete = async () => {
    console.log('🎉 Onboarding completed! Callback triggered');
    console.log('📝 Setting showOnboarding to false');
    
    // Ensure the state update happens immediately
    setShowOnboarding(false);
    setIsCheckingOnboarding(false);
    setCurrentScreen("home"); // Explicitly navigate to home screen
    
    // Force a re-check to ensure we're showing the main app
    setTimeout(() => {
      setShowOnboarding(false);
      console.log('✅ Should now show main app on home screen');
    }, 100);
  };

  const handleResetOnboarding = () => {
    console.log('🔄 Resetting onboarding...');
    setShowOnboarding(true);
  };

  // Save audio URI to local storage
  const saveAudioUri = async (audioId: string, audioUri: string) => {
    try {
      const key = `audioUri_${audioId}`;
      await AsyncStorage.setItem(key, audioUri);
      console.log(`💾 Saved audio URI for ${audioId}`);
    } catch (error) {
      console.error('Error saving audio URI:', error);
    }
  };

  // Load audio URI from local storage
  const loadAudioUri = async (audioId: string): Promise<string | undefined> => {
    try {
      const key = `audioUri_${audioId}`;
      const uri = await AsyncStorage.getItem(key);
      return uri || undefined;
    } catch (error) {
      console.error('Error loading audio URI:', error);
      return undefined;
    }
  };

  // Fetch fingerprints from backend
  const fetchFingerprints = async () => {
    if (!userId) {
      console.log('No userId yet, skipping fetch');
      return;
    }

    try {
      setIsLoading(true);
      const backendUrl = getBackendUrl();
      console.log('📥 Fetching fingerprints for user:', userId);

      const response = await axios.get(`${backendUrl}/api/audio/fingerprints`, {
        params: { userId }
      });

      if (response.data.success) {
        const fingerprints = response.data.fingerprints;
        console.log(`✅ Fetched ${fingerprints.length} fingerprints`);

        // Transform backend data to SavedSound format and load audio URIs
        const sounds: SavedSound[] = await Promise.all(
          fingerprints.map(async (fp: any) => {
            const audioUri = await loadAudioUri(fp.audioId);
            return {
              id: fp.audioId,
              label: fp.audioId,
              dateAdded: fp.timestamp ? new Date(fp.timestamp).toLocaleDateString() : 'Unknown',
              timesDetected: 0,
              enabled: true,
              audioData: fp.audioId,
              audioUri, // Load from AsyncStorage
            };
          })
        );

        // Merge with existing sounds instead of replacing
        setSavedSounds((prevSounds) => {
          // Keep sounds from onboarding (those with "From onboarding" dateAdded)
          const onboardingSounds = prevSounds.filter(s => s.dateAdded === "From onboarding");
          console.log(`📋 Onboarding sounds to preserve: ${onboardingSounds.length}`, JSON.stringify(onboardingSounds, null, 2));
          
          // Filter out duplicates based on audioData/audioId
          const newSounds = sounds.filter(s => 
            !onboardingSounds.some(os => os.audioData === s.audioData)
          );
          console.log(`📋 New sounds from backend: ${newSounds.length}`, JSON.stringify(newSounds, null, 2));
          
          const merged = [...onboardingSounds, ...newSounds];
          console.log(`📋 Total merged sounds: ${merged.length}`);
          return merged;
        });
      }
    } catch (error: any) {
      console.error('❌ Error fetching fingerprints:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch fingerprints when userId is available
  useEffect(() => {
    if (userId) {
      fetchFingerprints();
    }
  }, [userId]);

  // Refresh fingerprints when navigating to sounds screen
  useEffect(() => {
    if (currentScreen === 'sounds' && userId) {
      fetchFingerprints();
    }
  }, [currentScreen]);

  const handleSaveSound = async (label: string, audioData: string, audioUri: string) => {
    // Save audio URI to local storage for playback
    await saveAudioUri(audioData, audioUri);
    
    const newSound: SavedSound = {
      id: Date.now().toString(),
      label,
      dateAdded: "Just now",
      timesDetected: 0,
      enabled: true,
      audioData,
      audioUri, 
    };
    setSavedSounds((prev) => [newSound, ...prev]);
    
    // Refresh from backend to get the actual stored data
    setTimeout(() => fetchFingerprints(), 1000);
  };

  const handleToggleSound = (id: string) => {
    setSavedSounds((prev) =>
      prev.map((sound) =>
        sound.id === id ? { ...sound, enabled: !sound.enabled } : sound
      )
    );
  };

  const handleDeleteSound = async (id: string) => {
    try {
      const backendUrl = getBackendUrl();
      console.log('🗑️ Deleting fingerprint:', id);

      // Optimistically remove from UI
      setSavedSounds((prev) => prev.filter((sound) => sound.id !== id));

      // Delete audio URI from local storage
      const key = `audioUri_${id}`;
      await AsyncStorage.removeItem(key);
      console.log('💾 Deleted audio URI from storage');

      // Delete from backend
      const response = await axios.delete(`${backendUrl}/api/audio/fingerprint/${id}`);
      
      if (response.data.success) {
        console.log('✅ Deleted from backend');
      }
    } catch (error: any) {
      console.error('❌ Error deleting fingerprint:', error.message);
      // Refresh to restore if delete failed
      fetchFingerprints();
    }
  };

  const renderScreen = () => {
    console.log('🖼️ renderScreen called, currentScreen:', currentScreen);
    switch (currentScreen) {
      case "home":
        console.log('🖼️ Rendering HomeScreen component');
        return (
          <HomeScreen
            onTeachSound={() => setCurrentScreen("teach")}
            onViewHistory={() => setCurrentScreen("history")}
          />
        );

      case "sounds":
        return (
          <SavedSoundsScreen
            sounds={savedSounds}
            onToggleSound={handleToggleSound}
            onDeleteSound={handleDeleteSound}
            onTeachSound={() => setCurrentScreen("teach")}
          />
        );

      case "teach":
        return (
          <TeachSoundScreen
            onClose={() => setCurrentScreen("home")}
            onSave={handleSaveSound}
          />
        );

      case "history":
        return <EventHistoryScreen />;

      case "settings":
        return <SettingsScreen onResetOnboarding={handleResetOnboarding} />;

      default:
        return (
          <HomeScreen
            onTeachSound={() => setCurrentScreen("teach")}
            onViewHistory={() => setCurrentScreen("history")}
          />
        );
    }
  };

  // Show loading while checking onboarding status
  if (isCheckingOnboarding) {
    console.log('🔄 Rendering: Loading screen');
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safe}>
          <View style={[styles.container, styles.loadingContainer]}>
            <ActivityIndicator size="large" color="#6D5EF5" />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Show onboarding if not completed
  if (showOnboarding) {
    console.log('🔄 Rendering: Onboarding Flow');
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  console.log('🔄 Rendering: Main App');
  console.log('📱 Current screen:', currentScreen);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Main content */}
          <View style={styles.body}>{renderScreen()}</View>

          {/* Bottom nav */}
          {currentScreen !== "teach" && (
            <BottomNav currentScreen={currentScreen} onNavigate={setCurrentScreen} />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0F" },
  container: { flex: 1, backgroundColor: "#0B0B0F" },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  body: {
    flex: 1,
    // leaves space so content doesn't go behind the BottomNav
    paddingBottom: 72,
  },
});
