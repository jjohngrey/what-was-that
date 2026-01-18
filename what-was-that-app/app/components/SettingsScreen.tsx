import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Pressable, ScrollView, Alert, TextInput } from 'react-native';
import { Check, Shield, Eye, Cpu, FileCheck, RefreshCw, Phone, UserPlus } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { loadOnboardingData, saveOnboardingData } from '../../utils/onboarding-storage';

const COLORS = {
  bg: "#F5F5F7",
  card: "#FFFFFF",
  bgLight: "#F5F5F7",
  textPrimary: "#1F1F1F",
  textSecondary: "#757575",
  detected: "#4A6572", // Darker for better contrast
  confirmed: "#4CAF50",
  primary: "#4A6572", // Darker for better contrast
  critical: "#D32F2F",
  criticalBg: "#FFEBEE",
};

interface SettingsScreenProps {
  onResetOnboarding?: () => void;
}

const PRODUCTION_BACKEND = 'http://155.138.215.227:3000';

const getBackendUrl = () => {
  if (PRODUCTION_BACKEND) {
    return PRODUCTION_BACKEND;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:3000`;
  }
  return "http://localhost:3000";
};

export default function SettingsScreen({ onResetOnboarding }: SettingsScreenProps = {}) {
  const [isListening, setIsListening] = useState(true);
  const [sensitivity, setSensitivity] = useState<'low' | 'balanced' | 'high'>('balanced');
  
  // Emergency contact management
  const [emergencyContact, setEmergencyContact] = useState({ name: '', phone: '' });
  const [isEditingContact, setIsEditingContact] = useState(false);
  
  // Category-based alert settings
  const [safetyAlerts, setSafetyAlerts] = useState({
    flash: true,
    vibration: true,
    notification: true,
    overrideSilent: true,
  });
  const [dailyAlerts, setDailyAlerts] = useState({
    flash: false,
    vibration: false,
    notification: true,
    overrideSilent: false,
  });
  const [personalAlerts, setPersonalAlerts] = useState({
    flash: false,
    vibration: true,
    notification: true,
    overrideSilent: false,
  });

  const toggleSafetyAlert = (key: keyof typeof safetyAlerts) => {
    setSafetyAlerts({ ...safetyAlerts, [key]: !safetyAlerts[key] });
  };
  
  const toggleDailyAlert = (key: keyof typeof dailyAlerts) => {
    setDailyAlerts({ ...dailyAlerts, [key]: !dailyAlerts[key] });
  };
  
  const togglePersonalAlert = (key: keyof typeof personalAlerts) => {
    setPersonalAlerts({ ...personalAlerts, [key]: !personalAlerts[key] });
  };

  // Load emergency contact from onboarding data
  useEffect(() => {
    const loadContact = async () => {
      const data = await loadOnboardingData();
      if (data?.emergencyContact) {
        setEmergencyContact(data.emergencyContact);
      }
    };
    loadContact();
  }, []);

  const handleUpdateContact = async () => {
    if (!emergencyContact.name.trim() || !emergencyContact.phone.trim()) {
      Alert.alert('Error', 'Please enter both name and phone number.');
      return;
    }
    
    try {
      const data = await loadOnboardingData();
      const updatedData = {
        ...data,
        emergencyContact: {
          name: emergencyContact.name.trim(),
          phone: emergencyContact.phone.trim()
        }
      };
      await saveOnboardingData(updatedData);
      setIsEditingContact(false);
      Alert.alert('Success', 'Emergency contact updated successfully!');
    } catch (error) {
      console.error('Failed to update emergency contact:', error);
      Alert.alert('Error', 'Failed to update emergency contact. Please try again.');
    }
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will clear your onboarding settings and show the setup wizard again. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('onboarding_data');
              if (onResetOnboarding) {
                onResetOnboarding();
              } else {
                Alert.alert('Success', 'Onboarding has been reset. Please restart the app.');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to reset onboarding');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Customize your alerts</Text>

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
            trackColor={{ false: "#9E9E9E", true: COLORS.detected }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>


      {/* Safety Alerts Section */}
      <View style={styles.safetySection}>
        <Text style={styles.safetySectionTitle}>Safety Alerts</Text>
        <Text style={styles.safetySectionSubtitle}>Critical alerts for your protection</Text>
        
        <View style={styles.safetyCard}>
          <View style={styles.safetyRow}>
            <View style={styles.safetyIconContainer}>
              <Shield size={24} color={COLORS.critical} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.safetyCardTitle}>Smoke / Fire Alarm</Text>
              <Text style={styles.safetyCardSubtitle}>Required for safety – always on</Text>
            </View>
            <View style={styles.criticalBadge}>
              <Text style={styles.criticalBadgeText}>CRITICAL</Text>
            </View>
            <Switch
              value={true}
              disabled={true}
              trackColor={{ false: "#9E9E9E", true: COLORS.critical }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
        
        <Text style={styles.categorySettingsLabel}>Default Alert Methods:</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Flash</Text>
          <Switch
            value={safetyAlerts.flash}
            onValueChange={() => toggleSafetyAlert('flash')}
            trackColor={{ false: "#9E9E9E", true: COLORS.critical }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Vibration</Text>
          <Switch
            value={safetyAlerts.vibration}
            onValueChange={() => toggleSafetyAlert('vibration')}
            trackColor={{ false: "#9E9E9E", true: COLORS.critical }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Notification</Text>
          <Switch
            value={safetyAlerts.notification}
            onValueChange={() => toggleSafetyAlert('notification')}
            trackColor={{ false: "#9E9E9E", true: COLORS.critical }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Override Silent Mode</Text>
          <Switch
            value={safetyAlerts.overrideSilent}
            onValueChange={() => toggleSafetyAlert('overrideSilent')}
            trackColor={{ false: "#9E9E9E", true: COLORS.critical }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Daily Alerts Section */}
      <Text style={styles.sectionTitle}>Daily Alerts</Text>
      <Text style={styles.sectionSubtitle}>Routine sounds like doorbells and appliances</Text>
      <View style={styles.card}>
        <Text style={styles.categorySettingsLabel}>Default Alert Methods:</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Flash</Text>
          <Switch
            value={dailyAlerts.flash}
            onValueChange={() => toggleDailyAlert('flash')}
            trackColor={{ false: "#9E9E9E", true: COLORS.detected }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Vibration</Text>
          <Switch
            value={dailyAlerts.vibration}
            onValueChange={() => toggleDailyAlert('vibration')}
            trackColor={{ false: "#9E9E9E", true: COLORS.detected }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Notification</Text>
          <Switch
            value={dailyAlerts.notification}
            onValueChange={() => toggleDailyAlert('notification')}
            trackColor={{ false: "#9E9E9E", true: COLORS.detected }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Override Silent Mode</Text>
          <Switch
            value={dailyAlerts.overrideSilent}
            onValueChange={() => toggleDailyAlert('overrideSilent')}
            trackColor={{ false: "#9E9E9E", true: COLORS.detected }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Personal Alerts Section */}
      <Text style={styles.sectionTitle}>Personal Alerts</Text>
      <Text style={styles.sectionSubtitle}>Custom sounds you've recorded</Text>
      <View style={styles.card}>
        <Text style={styles.categorySettingsLabel}>Default Alert Methods:</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Flash</Text>
          <Switch
            value={personalAlerts.flash}
            onValueChange={() => togglePersonalAlert('flash')}
            trackColor={{ false: "#9E9E9E", true: COLORS.detected }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Vibration</Text>
          <Switch
            value={personalAlerts.vibration}
            onValueChange={() => togglePersonalAlert('vibration')}
            trackColor={{ false: "#9E9E9E", true: COLORS.detected }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Notification</Text>
          <Switch
            value={personalAlerts.notification}
            onValueChange={() => togglePersonalAlert('notification')}
            trackColor={{ false: "#9E9E9E", true: COLORS.detected }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Override Silent Mode</Text>
          <Switch
            value={personalAlerts.overrideSilent}
            onValueChange={() => togglePersonalAlert('overrideSilent')}
            trackColor={{ false: "#9E9E9E", true: COLORS.detected }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Emergency Contact Section */}
      <View style={styles.sectionHeader}>
        <Phone size={20} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>Emergency Contact</Text>
      </View>

        <View style={styles.card}>
          {!isEditingContact ? (
            // Display mode
            <>
              <View style={styles.contactDisplay}>
                <Text style={styles.contactLabel}>Name</Text>
                <Text style={styles.contactValue}>
                  {emergencyContact.name || 'Not set'}
                </Text>
              </View>
              <View style={styles.contactDisplay}>
                <Text style={styles.contactLabel}>Phone</Text>
                <Text style={styles.contactValue}>
                  {emergencyContact.phone || 'Not set'}
                </Text>
              </View>
              <Pressable
                onPress={() => setIsEditingContact(true)}
                style={styles.editContactButton}
              >
                <UserPlus size={18} color={COLORS.primary} />
                <Text style={styles.editContactButtonText}>
                  {emergencyContact.name ? 'Change Contact' : 'Add Contact'}
                </Text>
              </Pressable>
            </>
          ) : (
            // Edit mode
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={emergencyContact.name}
                  onChangeText={(text) => setEmergencyContact({ ...emergencyContact, name: text })}
                  placeholder="Caregiver's name"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={emergencyContact.phone}
                  onChangeText={(text) => setEmergencyContact({ ...emergencyContact, phone: text })}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.contactButtonRow}>
                <Pressable
                  onPress={() => {
                    setIsEditingContact(false);
                    // Reload original data
                    loadOnboardingData().then(data => {
                      if (data?.emergencyContact) {
                        setEmergencyContact(data.emergencyContact);
                      }
                    });
                  }}
                  style={styles.cancelContactButton}
                >
                  <Text style={styles.cancelContactButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleUpdateContact}
                  style={styles.saveContactButton}
                >
                  <Text style={styles.saveContactButtonText}>Save Contact</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

      {/* Alert Sensitivity */}
      <Text style={styles.sectionTitle}>Alert Sensitivity</Text>
      <Text style={styles.sectionSubtitle}>How easily sounds trigger alerts</Text>
      <View style={styles.card}>
        <View style={styles.sensitivityToggleContainer}>
          <Pressable
            onPress={() => setSensitivity('low')}
            style={[
              styles.sensitivityButton,
              styles.sensitivityButtonLeft,
              sensitivity === 'low' && styles.sensitivityButtonActive,
            ]}
          >
            <Text
              style={[
                styles.sensitivityButtonText,
                sensitivity === 'low' && styles.sensitivityButtonTextActive,
              ]}
            >
              Low
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSensitivity('balanced')}
            style={[
              styles.sensitivityButton,
              styles.sensitivityButtonMiddle,
              sensitivity === 'balanced' && styles.sensitivityButtonActive,
            ]}
          >
            <Text
              style={[
                styles.sensitivityButtonText,
                sensitivity === 'balanced' && styles.sensitivityButtonTextActive,
              ]}
            >
              Balanced
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setSensitivity('high')}
            style={[
              styles.sensitivityButton,
              styles.sensitivityButtonRight,
              sensitivity === 'high' && styles.sensitivityButtonActive,
            ]}
          >
            <Text
              style={[
                styles.sensitivityButtonText,
                sensitivity === 'high' && styles.sensitivityButtonTextActive,
              ]}
            >
              High
            </Text>
          </Pressable>
        </View>
        <Text style={styles.cardNote}>
          {sensitivity === 'low' && 'Low: Fewer alerts, less sensitive'}
          {sensitivity === 'balanced' && 'Balanced: Recommended for most users'}
          {sensitivity === 'high' && 'High: More alerts, very sensitive'}
        </Text>
      </View>

      {/* Reset Onboarding */}
      <Pressable
        onPress={handleResetOnboarding}
        style={({ pressed }) => [
          styles.resetButton,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <RefreshCw size={20} color={COLORS.textSecondary} />
        <Text style={styles.resetButtonText}>Reset onboarding</Text>
      </Pressable>
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
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginBottom: 24,
    fontSize: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
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
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  cardNote: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  safetySection: {
    borderWidth: 2,
    borderColor: COLORS.critical,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    backgroundColor: COLORS.card,
  },
  safetySectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  safetySectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  safetyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  safetyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.criticalBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  safetyCardSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  criticalBadge: {
    backgroundColor: COLORS.critical,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  criticalBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  deliveryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 12,
    letterSpacing: 1,
  },
  categorySettingsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  toggleLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sensitivityToggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  sensitivityButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensitivityButtonLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  sensitivityButtonMiddle: {
    marginHorizontal: 4,
    borderRadius: 8,
  },
  sensitivityButtonRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  sensitivityButtonActive: {
    backgroundColor: COLORS.detected,
  },
  sensitivityButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sensitivityButtonTextActive: {
    color: '#FFFFFF',
  },
  previewButton: {
    backgroundColor: COLORS.detected,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  testNotificationButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  testNotificationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  contactDisplay: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  contactLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  editContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editContactButtonText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  contactButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelContactButton: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelContactButtonText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  saveContactButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveContactButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});