import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Event {
  id: string;
  name: string;
  location: string;
  timestamp: string;
  confidence: number;
  type: "detected" | "confirmed" | "attention";
}

const COLORS = {
  bg: "#0B0B0F",
  card: "#15151C",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A0AA",
  detected: "#3B82F6",
  confirmed: "#22C55E",
  attention: "#F59E0B",
};

export default function EventHistoryScreen() {
  const events: Event[] = [
    { id: "1", name: "Door knock", location: "Living room", timestamp: "2 minutes ago", confidence: 87, type: "detected" },
    { id: "2", name: "Footsteps", location: "Hallway", timestamp: "15 minutes ago", confidence: 92, type: "confirmed" },
    { id: "3", name: "Object dropped", location: "Kitchen", timestamp: "1 hour ago", confidence: 78, type: "attention" },
    { id: "4", name: "Door knock", location: "Front door", timestamp: "3 hours ago", confidence: 85, type: "detected" },
    { id: "5", name: "Appliance", location: "Kitchen", timestamp: "5 hours ago", confidence: 95, type: "confirmed" },
    { id: "6", name: "Footsteps", location: "Bedroom", timestamp: "Yesterday", confidence: 88, type: "detected" },
  ];

  const getColorForType = (type: Event["type"]) => {
    switch (type) {
      case "confirmed":
        return COLORS.confirmed;
      case "attention":
        return COLORS.attention;
      default:
        return COLORS.detected;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Event History</Text>
      <Text style={styles.subtitle}>You're aware — not alarmed</Text>

      <View style={styles.list}>
        {events.map((event) => (
          <View key={event.id} style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.dot, { backgroundColor: getColorForType(event.type) }]} />

              <View style={styles.content}>
                <View style={styles.topRow}>
                  <Text style={styles.eventName}>{event.name}</Text>
                  <Text style={styles.confidence}>{event.confidence}%</Text>
                </View>

                <Text style={styles.meta}>{event.location}</Text>
                <Text style={styles.timestamp}>{event.timestamp}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 24 },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 6 },
  subtitle: { color: COLORS.textSecondary, marginBottom: 18 },
  list: { gap: 12 }, // if RN complains, replace w/ marginBottom on card
  card: { backgroundColor: COLORS.card, borderRadius: 18, padding: 16 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 999, marginTop: 4 },
  content: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  eventName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "600", paddingRight: 10, flexShrink: 1 },
  confidence: { color: COLORS.textSecondary, fontSize: 13 },
  meta: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 2 },
  timestamp: { color: COLORS.textSecondary, fontSize: 12 },
});
