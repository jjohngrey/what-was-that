import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { User } from "lucide-react-native";

interface PersonaStepProps {
  initialFirstName?: string;
  onNext: (firstName: string) => void;
  onBack: () => void;
}

export default function PersonaStep({ initialFirstName = '', onNext, onBack }: PersonaStepProps) {
  const [firstName, setFirstName] = useState(initialFirstName);

  const handleNext = () => {
    if (firstName.trim()) {
      onNext(firstName.trim());
    }
  };

  const canContinue = firstName.trim().length > 0;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <User size={48} color="#4A6572" strokeWidth={2} />
          </View>
        </View>

        <Text style={styles.title}>What should I call you?</Text>
        <Text style={styles.subtitle}>
          We'll use your name to personalize your experience.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter your first name"
            placeholderTextColor="#9E9E9E"
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus={true}
            returnKeyType="next"
            onSubmitEditing={handleNext}
          />
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          onPress={handleNext}
          disabled={!canContinue}
          style={({ pressed }) => [
            styles.primaryBtn,
            !canContinue && styles.primaryBtnDisabled,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={[styles.primaryBtnText, !canContinue && styles.primaryBtnTextDisabled]}>
            Continue
          </Text>
        </Pressable>

        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingBottom: 40, // More padding at bottom for better button placement
    backgroundColor: "#F5F5F7",
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F1F1F",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#757575",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  inputContainer: {
    width: "100%",
    maxWidth: 400,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 18,
    color: "#1F1F1F",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    textAlign: "center",
    fontWeight: "600",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: "#4A6572",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnDisabled: {
    backgroundColor: "#E0E0E0",
  },
  primaryBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  primaryBtnTextDisabled: {
    color: "#9E9E9E",
  },
  backBtn: {
    paddingVertical: 16,
    alignItems: "center",
  },
  backBtnText: {
    color: "#616161",
    fontWeight: "600",
    fontSize: 16,
  },
});

