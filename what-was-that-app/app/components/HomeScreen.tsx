import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

interface HomeScreenProps {
  onTeachSound: () => void;
  onViewHistory: () => void;
}

export default function HomeScreen({ onTeachSound, onViewHistory }: HomeScreenProps) {
  const [listening, setListening] = useState(false);

  useEffect(() => {
    // your existing logic
  }, []);

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>
          {listening ? "Listening..." : "Tap to start listening"}
        </Text>
      </View>

      <Pressable
        onPress={() => setListening((prev) => !prev)}
        style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
      >
        <Text style={styles.cardTitle}>Live</Text>
        <Text style={styles.cardBody}>
          {listening ? "Listening for sounds..." : "Sound detection is off."}
        </Text>
      </Pressable>

      <View style={{ marginTop: 16, gap: 10 }}>
        <Pressable onPress={onTeachSound} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Teach a new sound</Text>
        </Pressable>

        <Pressable onPress={onViewHistory} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>View event history</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#0B0B0F" },
  title: { fontSize: 28, fontWeight: "700", color: "#fff" },
  subtitle: { marginTop: 8, color: "#A0A0AA" },
  card: {
    marginTop: 16,
    backgroundColor: "#15151C",
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: { color: "#fff", fontWeight: "600", fontSize: 16 },
  cardBody: { marginTop: 6, color: "#A0A0AA" },

  primaryBtn: {
    backgroundColor: "#6D5EF5",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "700" },

  secondaryBtn: {
    backgroundColor: "#15151C",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: { color: "white", fontWeight: "700" },
});
