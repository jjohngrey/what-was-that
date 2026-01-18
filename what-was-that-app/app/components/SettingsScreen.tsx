import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, Pressable, ScrollView } from 'react-native';
import { Check, Shield, Eye, Cpu, FileCheck } from 'lucide-react-native';

const COLORS = {
  bg: "#0B0B0F",
  card: "#15151C",
  bgLight: "#1E1E27",
  textPrimary: "#FFFFFF",
  textSecondary: "#A0A0AA",
  detected: "#3B82F6",
  confirmed: "#22C55E",
  primary: "#6D5EF5",
};

export default function SettingsScreen() {
  const [isListening, setIsListening] = useState(true);
  const [sensitivity, setSensitivity] = useState(70);
  const [notifications, setNotifications] = useState({
    vibration: true,
    visual: true,
    sound: false,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications({ ...notifications, [key]: !notifications[key] });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Private by design</Text>

      {/* Listening Toggle */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>Listening</Text>
            <Text style={styles.cardSubtitle}>Detect vibration patterns</Text>
          </View>
          <Switch
            value={isListening}
            onValueChange={setIsListening}
            trackColor={{ false: COLORS.textSecondary, true: COLORS.confirmed }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Sensitivity Slider */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sensitivity</Text>
        <View style={styles.sliderContainer}>
          <View style={styles.sliderTrack}>
            <View style={[styles.sliderFill, { width: `${sensitivity}%` }]} />
          </View>
          <View style={styles.sliderRow}>
            <Pressable onPress={() => setSensitivity(Math.max(0, sensitivity - 10))}>
              <Text style={styles.sliderLabel}>Low</Text>
            </Pressable>
            <Text style={styles.sensitivityValue}>{sensitivity}%</Text>
            <Pressable onPress={() => setSensitivity(Math.min(100, sensitivity + 10))}>
              <Text style={styles.sliderLabel}>High</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Notification Preferences */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Notification preferences</Text>
        
        {[
          { key: 'vibration' as const, label: 'Vibration alerts' },
          { key: 'visual' as const, label: 'Visual alerts' },
          { key: 'sound' as const, label: 'Sound alerts' },
        ].map(({ key, label }) => (
          <Pressable
            key={key}
            onPress={() => toggleNotification(key)}
            style={styles.notificationRow}
          >
            <Text style={styles.notificationLabel}>{label}</Text>
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: notifications[key] ? COLORS.detected : COLORS.textSecondary,
                  backgroundColor: notifications[key] ? COLORS.detected : 'transparent',
                },
              ]}
            >
              {notifications[key] && <Check size={16} color="white" />}
            </View>
          </Pressable>
        ))}
      </View>

      {/* Privacy Section */}
      <Text style={styles.sectionTitle}>Privacy</Text>
      {[
        { icon: <Cpu size={24} color={COLORS.confirmed} />, text: 'On-device processing' },
        { icon: <Shield size={24} color={COLORS.confirmed} />, text: 'Audio stored locally only' },
        { icon: <FileCheck size={24} color={COLORS.confirmed} />, text: 'Pattern matching technology' },
        { icon: <Eye size={24} color={COLORS.confirmed} />, text: 'No cameras' },
      ].map((item, idx) => (
        <View key={idx} style={styles.privacyCard}>
          <View style={styles.iconContainer}>
            {item.icon}
          </View>
          <Text style={styles.privacyText}>{item.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginBottom: 18,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flex1: {
    flex: 1,
    paddingRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sliderContainer: {
    marginTop: 12,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: COLORS.bgLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: COLORS.detected,
  },
  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sensitivityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  notificationLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 8,
    marginBottom: 12,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.confirmed,
    opacity: 0.15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
});