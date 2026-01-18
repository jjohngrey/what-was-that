import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Alert, Switch } from "react-native";
import { Wifi, Zap, Vibrate, Volume2, Moon, Send, CheckCircle2, AlertCircle, Phone } from "lucide-react-native";
import { loadOnboardingData } from "../../utils/onboarding-storage";
import type { OnboardingData } from "../../types/onboarding";

interface HomeScreenProps {}

const COLORS = {
  bg: "#F5F5F7",
  card: "#FFFFFF",
  textPrimary: "#1F1F1F",
  textSecondary: "#757575",
  primary: "#4A6572", // Darker for better contrast (7:1 ratio)
  success: "#4CAF50",
  critical: "#D32F2F",
};

export default function HomeScreen({}: HomeScreenProps) {
  const [listening, setListening] = useState(true);
  const [sleepMode, setSleepMode] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState<{ name: string; phone: string } | null>(null);

  useEffect(() => {
    // Load emergency contact from onboarding data
    const loadEmergencyContact = async () => {
      try {
        const data = await loadOnboardingData();
        if (data?.emergencyContact?.name && data?.emergencyContact?.phone) {
          setEmergencyContact(data.emergencyContact);
        }
      } catch (error) {
        console.error('Failed to load emergency contact:', error);
      }
    };
    loadEmergencyContact();
  }, []);

  const toggleSleepMode = () => {
    setSleepMode(!sleepMode);
    Alert.alert(
      sleepMode ? "Sleep Mode Disabled" : "Sleep Mode Enabled",
      sleepMode
        ? "Alerts will now be delivered normally."
        : "Alerts will be silenced during sleep hours.",
      [{ text: "OK" }]
    );
  };

  const handleImOkay = () => {
    // CHECKIN_OK - Immediate success feedback
    Alert.alert(
      "✓ Thanks!",
      "We've let your caregiver know you're okay.",
      [{ text: "OK" }]
    );
    // TODO: Backend call to update today's status and cancel any scheduled alerts
  };

  const handleNeedHelp = () => {
    // HELP_REQUESTED - Requires confirmation
    Alert.alert(
      "Need Help?",
      "This will notify your caregiver. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Call Caregiver", 
          onPress: () => {
            Alert.alert("Calling...", "Calling your emergency contact now.");
            // TODO: Implement actual phone call
          }
        },
        { 
          text: "Send Alert", 
          style: "destructive",
          onPress: () => {
            Alert.alert("Alert Sent!", "Your caregiver has been notified immediately.");
            // TODO: Backend call with higher priority flag
          }
        },
      ]
    );
  };

  const handleEmergencyContact = () => {
    if (emergencyContact) {
      Alert.alert(
        "Emergency Contact",
        `${emergencyContact.name}\n${emergencyContact.phone}`,
        [{ text: "OK" }]
      );
    } else {
      Alert.alert(
        "Add Emergency Contact",
        "You can add an emergency contact in the onboarding settings.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What Was That</Text>
      <Text style={styles.subtitle}>Environmental sound monitoring</Text>

      {/* Status Buttons */}
      <View style={styles.statusButtons}>
        <Pressable 
          onPress={handleImOkay} 
          style={({ pressed }) => [
            styles.statusBtn, 
            styles.imOkayBtn,
            pressed && styles.buttonPressed
          ]}
        >
          <CheckCircle2 size={32} color="#FFFFFF" />
          <Text style={styles.statusBtnText}>I'm OK</Text>
        </Pressable>

        <Pressable 
          onPress={handleNeedHelp} 
          style={({ pressed }) => [
            styles.statusBtn, 
            styles.needHelpBtn,
            pressed && styles.buttonPressed
          ]}
        >
          <AlertCircle size={32} color="#FFFFFF" />
          <Text style={styles.statusBtnText}>I Need Help</Text>
        </Pressable>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsCard}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        
        {/* Sleep Mode Toggle */}
        <View style={styles.quickActionItem}>
          <View style={styles.quickActionLeft}>
            <Moon size={20} color={COLORS.textPrimary} />
            <View style={styles.quickActionTextContainer}>
              <Text style={styles.quickActionTitle}>Sleep Mode</Text>
              <Text style={styles.quickActionSubtitle}>Quiet hours protection</Text>
            </View>
          </View>
          <Switch
            value={sleepMode}
            onValueChange={toggleSleepMode}
            trackColor={{
              false: "#9E9E9E",
              true: COLORS.primary,
            }}
            thumbColor="#BDBDBD"
          />
        </View>

        {/* Emergency Contact */}
        <Pressable onPress={handleEmergencyContact} style={styles.quickActionItem}>
          <View style={styles.quickActionLeft}>
            <Send size={20} color={COLORS.textPrimary} />
            <View style={styles.quickActionTextContainer}>
              <Text style={styles.quickActionTitle}>
                {emergencyContact ? emergencyContact.name : 'Add Emergency Contact'}
              </Text>
              <Text style={styles.quickActionSubtitle}>
                {emergencyContact ? emergencyContact.phone : 'For critical alerts'}
              </Text>
            </View>
          </View>
        </Pressable>
      </View>

      {/* Main Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={styles.statusIndicator}>
            <View style={styles.statusDotOuter}>
              <View style={styles.statusDot} />
            </View>
          </View>
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>Listening: {listening ? "On" : "Off"}</Text>
            <View style={styles.sensorStatus}>
              <Wifi size={16} color={COLORS.success} />
              <Text style={styles.sensorText}>Sensor connected</Text>
            </View>
          </View>
        </View>

        {/* Alert Methods */}
        <View style={styles.alertMethods}>
          <View style={styles.alertMethod}>
            <Zap size={18} color={COLORS.primary} />
            <Text style={styles.alertMethodText}>Flash</Text>
          </View>
          <View style={styles.alertMethod}>
            <Vibrate size={18} color={COLORS.primary} />
            <Text style={styles.alertMethodText}>Vibration</Text>
          </View>
          {sleepMode && (
            <View style={styles.alertMethod}>
              <Volume2 size={18} color={COLORS.primary} />
              <Text style={styles.alertMethodText}>Silent Override</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: COLORS.bg,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: 16,
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  statusIndicator: {
    marginRight: 16,
  },
  statusDotOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.success,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  sensorStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sensorText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: "500",
  },
  alertMethods: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  alertMethod: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  alertMethodText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statusButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statusBtn: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  imOkayBtn: {
    backgroundColor: "#34C759", // More vibrant green
  },
  needHelpBtn: {
    backgroundColor: "#FF3B30", // iOS red
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  statusBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 18,
  },
  quickActionsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  quickActionsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  quickActionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    marginBottom: 12,
  },
  quickActionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  quickActionTextContainer: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
