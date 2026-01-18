import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { OnboardingData } from "../../../types/onboarding";

interface EmergencyContactStepProps {
  emergencyContact: OnboardingData["emergencyContact"];
  onEmergencyContactChange: (contact: OnboardingData["emergencyContact"]) => void;
  onNext: () => void;
  onBack?: () => void;
  showBack?: boolean;
}

export default function EmergencyContactStep({
  emergencyContact,
  onEmergencyContactChange,
  onNext,
  onBack,
  showBack,
}: EmergencyContactStepProps) {
  const [errors, setErrors] = useState({ name: "", phone: "" });

  const validatePhone = (phone: string): boolean => {
    // Basic phone validation - at least 10 digits
    const digitsOnly = phone.replace(/\D/g, "");
    return digitsOnly.length >= 10;
  };

  const handleContinue = () => {
    // Validate if any field is filled
    if (emergencyContact.name || emergencyContact.phone) {
      const newErrors = { name: "", phone: "" };
      let hasErrors = false;

      if (emergencyContact.phone && !validatePhone(emergencyContact.phone)) {
        newErrors.phone = "Please enter a valid phone number";
        hasErrors = true;
      }

      setErrors(newErrors);

      if (!hasErrors) {
        onNext();
      }
    } else {
      // Allow skip if both are empty
      onNext();
    }
  };

  const handleSkip = () => {
    onEmergencyContactChange({ name: "", phone: "" });
    onNext();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Emergency Contact</Text>
        <Text style={styles.subtitle}>
          Used only for critical alerts if you choose to escalate.
        </Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor="#9E9E9E"
              value={emergencyContact.name}
              onChangeText={(text) =>
                onEmergencyContactChange({ ...emergencyContact, name: text })
              }
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone number *</Text>
            <TextInput
              style={[styles.input, errors.phone ? styles.inputError : null]}
              placeholder="+1 (555) 123-4567"
              placeholderTextColor="#9E9E9E"
              value={emergencyContact.phone}
              onChangeText={(text) => {
                onEmergencyContactChange({ ...emergencyContact, phone: text });
                setErrors({ ...errors, phone: "" });
              }}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
            {errors.phone ? (
              <Text style={styles.errorText}>{errors.phone}</Text>
            ) : null}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Your emergency contact will only be notified for critical safety
              alerts like smoke alarms or glass breaking.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.continueBtn,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </Pressable>

        <Pressable onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F1F1F",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#757575",
    marginBottom: 32,
    lineHeight: 24,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F1F1F",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: "#1F1F1F",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  inputError: {
    borderColor: "#D32F2F",
  },
  errorText: {
    fontSize: 13,
    color: "#D32F2F",
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#4A6572",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  infoText: {
    fontSize: 14,
    color: "#757575",
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  continueBtn: {
    backgroundColor: "#4A6572", // Darker for better contrast
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  continueBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  skipBtn: {
    paddingVertical: 16,
    alignItems: "center",
  },
  skipBtnText: {
    color: "#757575",
    fontWeight: "600",
    fontSize: 16,
  },
});

