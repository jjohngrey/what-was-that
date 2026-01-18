import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

interface CompletionStepProps {
  onFinish: () => void;
}

export default function CompletionStep({ onFinish }: CompletionStepProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✅</Text>
        </View>
        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.subtitle}>
          Your alerts are configured and ready to go. You can change these
          settings anytime in the Settings tab.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          onPress={onFinish}
          style={({ pressed }) => [
            styles.finishBtn,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.finishBtnText}>Go to Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#F5F5F7",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1F1F1F",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#757575",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  finishBtn: {
    backgroundColor: "#4A6572", // Darker for better contrast
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  finishBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});

