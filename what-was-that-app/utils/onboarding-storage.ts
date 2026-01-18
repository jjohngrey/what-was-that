import AsyncStorage from "@react-native-async-storage/async-storage";
import { OnboardingData, defaultOnboardingData } from "../types/onboarding";

const ONBOARDING_KEY = "onboarding_data";

export const loadOnboardingData = async (): Promise<OnboardingData> => {
  try {
    console.log('📖 loadOnboardingData: Reading from AsyncStorage');
    const data = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      console.log('📖 loadOnboardingData: Data found:', JSON.stringify(parsed, null, 2));
      return parsed;
    }
    console.log('📖 loadOnboardingData: No data found, returning defaults');
    return defaultOnboardingData;
  } catch (error) {
    console.error("Error loading onboarding data:", error);
    return defaultOnboardingData;
  }
};

export const saveOnboardingData = async (data: OnboardingData): Promise<void> => {
  try {
    console.log('💾 saveOnboardingData: Saving to AsyncStorage:', JSON.stringify(data, null, 2));
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
    console.log('✅ saveOnboardingData: Data saved successfully');
    
    // Verify the save
    const verification = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (verification) {
      const verified = JSON.parse(verification);
      console.log('✅ saveOnboardingData: Verified saved data:', JSON.stringify(verified, null, 2));
    }
  } catch (error) {
    console.error("Error saving onboarding data:", error);
  }
};

export const checkOnboardingComplete = async (): Promise<boolean> => {
  try {
    const data = await loadOnboardingData();
    return data.onboardingComplete;
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return false;
  }
};

