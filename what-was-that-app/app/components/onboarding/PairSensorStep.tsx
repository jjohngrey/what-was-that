import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";

interface PairSensorStepProps {
  onNext: () => void;
  onBack?: () => void;
  showBack?: boolean;
  onSensorPaired: (paired: boolean) => void;
}

type SensorStatus = "not_connected" | "connecting" | "connected" | "error";

export default function PairSensorStep({ onNext, onBack, showBack, onSensorPaired }: PairSensorStepProps) {
  const [status, setStatus] = useState<SensorStatus>("not_connected");

  const handlePairSensor = () => {
    setStatus("connecting");
    
    // Simulate pairing process
    setTimeout(() => {
      // 90% success rate for demo
      const success = Math.random() > 0.1;
      if (success) {
        setStatus("connected");
        onSensorPaired(true);
      } else {
        setStatus("error");
        onSensorPaired(false);
      }
    }, 1500);
  };

  const getStatusColor = () => {
    switch (status) {
      case "connected":
        return "#4CAF50";
      case "error":
        return "#D32F2F";
      case "connecting":
        return "#FF9800";
      default:
        return "#757575";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "connected":
        return "Connected";
      case "error":
        return "Pairing failed";
      case "connecting":
        return "Connecting...";
      default:
        return "Not connected";
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Pair Sensor</Text>

        <View style={[styles.statusCard, { borderColor: getStatusColor() }]}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Sensor status</Text>
            {status === "connecting" && (
              <ActivityIndicator size="small" color="#FF9800" />
            )}
          </View>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>

        {status === "not_connected" || status === "error" ? (
          <Pressable
            onPress={handlePairSensor}
            style={({ pressed }) => [
              styles.pairBtn,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={styles.pairBtnText}>
              {status === "error" ? "Try again" : "Pair sensor"}
            </Text>
          </Pressable>
        ) : null}

        {status === "error" && (
          <Text style={styles.errorText}>
            Make sure your sensor is turned on and nearby.
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Pressable
          onPress={onNext}
          disabled={status !== "connected"}
          style={({ pressed }) => [
            styles.continueBtn,
            {
              opacity: status === "connected" ? (pressed ? 0.9 : 1) : 0.4,
              backgroundColor: status === "connected" ? "#4A6572" : "#E0E0E0",
            },
          ]}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </Pressable>

        <Pressable onPress={onNext} style={styles.skipBtn}>
          <Text style={styles.skipBtnText}>Skip pairing</Text>
        </Pressable>
      </View>
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
    marginBottom: 32,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    borderWidth: 2,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 14,
    color: "#757575",
    fontWeight: "600",
  },
  statusText: {
    fontSize: 20,
    fontWeight: "700",
  },
  pairBtn: {
    backgroundColor: "#4A6572", // Darker for better contrast
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  pairBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  errorText: {
    color: "#D32F2F",
    textAlign: "center",
    fontSize: 14,
  },
  buttonContainer: {
    gap: 12,
  },
  continueBtn: {
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
    color: "#616161", // Darker for better contrast
    fontWeight: "600",
    fontSize: 16,
  },
});

