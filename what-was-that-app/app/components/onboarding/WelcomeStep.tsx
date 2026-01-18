import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

interface WelcomeStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export default function WelcomeStep({ onNext, onSkip }: WelcomeStepProps) {
  console.log('👋 WelcomeStep function called');
  
  useEffect(() => {
    console.log('👋 WelcomeStep MOUNTED (useEffect fired)');
    return () => {
      console.log('👋 WelcomeStep UNMOUNTED');
    };
  }, []);

  console.log('👋 WelcomeStep rendering JSX...');
  
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Set up your alerts</Text>
        <Text style={styles.subtitle}>
          We'll connect your sensor and customize how you get notified.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          onPress={onNext}
          style={({ pressed }) => [
            styles.primaryBtn,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.primaryBtnText}>Get started</Text>
        </Pressable>

        <Pressable onPress={onSkip} style={styles.skipBtn}>
          <Text style={styles.skipBtnText}>Skip for now</Text>
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
  },
  buttonContainer: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: "#4A6572", // Darker for better contrast
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  skipBtn: {
    paddingVertical: 16,
    alignItems: "center",
  },
  skipBtnText: {
    color: "#616161", // Darker for better contrast
    fontWeight: "600",
    fontSize: 16,
  },
});

