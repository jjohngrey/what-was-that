import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import HomeScreen from "./app/components/HomeScreen";
import SavedSoundsScreen from "./app/components/SavedSoundsScreen";
import TeachSoundScreen from "./app/components/TeachSoundScreen";
import EventHistoryScreen from "./app/components/EventHistoryScreen";
import SettingsScreen from "./app/components/SettingsScreen";
import BottomNav from "./app/components/BottomNav";

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

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [savedSounds, setSavedSounds] = useState<SavedSound[]>([]);

  const handleSaveSound = (label: string, audioData: string, audioUri?: string) => {
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
  };

  const handleToggleSound = (id: string) => {
    setSavedSounds((prev) =>
      prev.map((sound) =>
        sound.id === id ? { ...sound, enabled: !sound.enabled } : sound
      )
    );
  };

  const handleDeleteSound = (id: string) => {
    setSavedSounds((prev) => prev.filter((sound) => sound.id !== id));
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
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
        return <SettingsScreen />;

      default:
        return (
          <HomeScreen
            onTeachSound={() => setCurrentScreen("teach")}
            onViewHistory={() => setCurrentScreen("history")}
          />
        );
    }
  };

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
  body: {
    flex: 1,
    // leaves space so content doesn't go behind the BottomNav
    paddingBottom: 72,
  },
});
