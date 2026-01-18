import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
} from "react-native";
import { MotiView } from "moti";
import { Trash2, Volume2, Plus } from "lucide-react-native";

interface SavedSound {
  id: string;
  label: string;
  dateAdded: string;
  timesDetected: number;
  enabled: boolean;
  audioData: string;
}

interface SavedSoundsScreenProps {
  sounds: SavedSound[];
  onToggleSound: (id: string) => void;
  onDeleteSound: (id: string) => void;
  onTeachSound: () => void;
}

const COLORS = {
  bg: "#0B0B0F",
  card: "#15151C",
  bgLight: "#1E1E27",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A0AA",
  primary: "#6D5EF5",
  detected: "#3B82F6",
  critical: "#EF4444",
};

export default function SavedSoundsScreen({
  sounds,
  onToggleSound,
  onDeleteSound,
  onTeachSound,
}: SavedSoundsScreenProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const confirmDelete = (sound: SavedSound) => {
    Alert.alert(
      "Delete sound?",
      `Delete "${sound.label}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDeleteSound(sound.id),
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved Sounds</Text>
      <Text style={styles.subtitle}>
        {sounds.length} {sounds.length === 1 ? "sound" : "sounds"} ready to detect
      </Text>

      {/* Teach New Sound Button */}
      <Pressable onPress={onTeachSound} style={styles.teachBtn}>
        <Plus size={20} color="white" />
        <Text style={styles.teachBtnText}>Teach a new sound</Text>
      </Pressable>

      {sounds.length === 0 ? (
        <View style={styles.emptyCard}>
          <Volume2 size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>No sounds saved yet</Text>
          <Text style={styles.emptyBody}>
            Use the Home screen to teach a new sound
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {sounds.map((sound, idx) => {
            const expanded = expandedId === sound.id;

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
                    <Text style={styles.soundLabel}>{sound.label}</Text>

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
                      false: COLORS.textSecondary,
                      true: COLORS.detected,
                    }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() =>
                      setExpandedId(expanded ? null : sound.id)
                    }
                    style={styles.actionBtn}
                  >
                    <Volume2 size={16} color={COLORS.textPrimary} />
                    <Text style={styles.actionBtnText}>Play sample</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => confirmDelete(sound)}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={16} color={COLORS.critical} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  teachBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10, // if RN complains, use marginLeft on text
    marginBottom: 16,
  },
  teachBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 12,
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  emptyBody: {
    marginTop: 6,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontSize: 13,
  },
  list: {
    gap: 12, // if RN complains, replace with marginBottom on cards
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  soundLabel: {
    color: COLORS.textPrimary,
    fontSize: 16,
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
    gap: 10, // if RN complains, use marginRight on first button
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.bgLight,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  deleteBtn: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
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
