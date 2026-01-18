import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Clock } from "lucide-react-native";

interface Event {
  id: string;
  name: string;
  location: string;
  timestamp: string;
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
  const events: Event[] = []; // Empty - no placeholders

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
    <ScrollView 
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Event History</Text>
      <Text style={styles.subtitle}>You're aware — not alarmed</Text>

      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Clock size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>No events yet</Text>
          <Text style={styles.emptyBody}>
            Detected sounds will appear here
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {events.map((event) => (
            <View key={event.id} style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.dot, { backgroundColor: getColorForType(event.type) }]} />

                <View style={styles.content}>
                  <Text style={styles.eventName}>{event.name}</Text>
                  <Text style={styles.meta}>{event.location}</Text>
                  <Text style={styles.timestamp}>{event.timestamp}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
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
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 24 },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 6 },
  subtitle: { color: COLORS.textSecondary, marginBottom: 18 },
  emptyState: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 32,
    alignItems: "center",
    marginTop: 24,
  },
  emptyTitle: {
    marginTop: 16,
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 18,
  },
  emptyBody: {
    marginTop: 8,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 14,
  },
  list: { gap: 12 },
  card: { backgroundColor: COLORS.card, borderRadius: 18, padding: 16 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 999, marginTop: 4 },
  content: { flex: 1 },
  eventName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "600", marginBottom: 4 },
  meta: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 2 },
  timestamp: { color: COLORS.textSecondary, fontSize: 12 },
});
