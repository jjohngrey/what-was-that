import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  Modal,
} from "react-native";
import * as Haptics from "expo-haptics";
import { OnboardingData } from "../../../types/onboarding";

interface AlertDeliveryStepProps {
  delivery: OnboardingData["delivery"];
  onDeliveryChange: (delivery: OnboardingData["delivery"]) => void;
  onNext: () => void;
  onBack?: () => void;
  showBack?: boolean;
}

export default function AlertDeliveryStep({
  delivery,
  onDeliveryChange,
  onNext,
  onBack,
  showBack,
}: AlertDeliveryStepProps) {
  const [showPreview, setShowPreview] = useState(false);

  const toggleDelivery = (key: keyof OnboardingData["delivery"]) => {
    onDeliveryChange({
      ...delivery,
      [key]: !delivery[key],
    });
  };

  const handlePreviewAlert = async () => {
    // Trigger haptic feedback
    if (delivery.vibration) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 200);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 400);
    }

    // Show preview modal
    setShowPreview(true);

    // Auto-close after 2 seconds
    setTimeout(() => {
      setShowPreview(false);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Alert Delivery</Text>
        <Text style={styles.subtitle}>
          Choose how you'd like to receive alerts.
        </Text>

        <View style={styles.section}>
          <View style={styles.deliveryItem}>
            <View style={styles.deliveryItemLeft}>
              <Text style={styles.deliveryLabel}>Flashlight blinking</Text>
              <Text style={styles.deliveryDescription}>
                Flash your phone's light to grab attention
              </Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={delivery.flashlight}
                onValueChange={() => toggleDelivery("flashlight")}
                trackColor={{ false: "#9E9E9E", true: "#4A6572" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.deliveryItem}>
            <View style={styles.deliveryItemLeft}>
              <Text style={styles.deliveryLabel}>Strong vibration</Text>
              <Text style={styles.deliveryDescription}>
                Intense haptic feedback for critical alerts
              </Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={delivery.vibration}
                onValueChange={() => toggleDelivery("vibration")}
                trackColor={{ false: "#9E9E9E", true: "#4A6572" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          <View style={styles.deliveryItem}>
            <View style={styles.deliveryItemLeft}>
              <Text style={styles.deliveryLabel}>Override silent mode</Text>
              <Text style={styles.deliveryDescription}>
                Sound alerts even when your phone is on silent
              </Text>
            </View>
            <View style={styles.switchContainer}>
              <Switch
                value={delivery.overrideSilent}
                onValueChange={() => toggleDelivery("overrideSilent")}
                trackColor={{ false: "#9E9E9E", true: "#4A6572" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        <Pressable
          onPress={handlePreviewAlert}
          style={({ pressed }) => [
            styles.previewBtn,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.previewBtnText}>Preview alert</Text>
        </Pressable>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          onPress={onNext}
          style={({ pressed }) => [
            styles.continueBtn,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </Pressable>
      </View>

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>🚨 Alert Preview</Text>
            <Text style={styles.previewText}>
              This is what your alert will look and feel like!
            </Text>
          </View>
        </View>
      </Modal>
    </View>
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
  section: {
    marginBottom: 24,
  },
  deliveryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  deliveryItemLeft: {
    flex: 1,
  },
  deliveryLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F1F1F",
    marginBottom: 4,
  },
  deliveryDescription: {
    fontSize: 13,
    color: "#757575",
    lineHeight: 18,
  },
  switchContainer: {
    marginLeft: 16,
  },
  previewBtn: {
    backgroundColor: "#4A6572", // Darker for better contrast
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  previewBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewCard: {
    backgroundColor: "#D32F2F",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    maxWidth: 320,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  previewText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    lineHeight: 24,
  },
});

