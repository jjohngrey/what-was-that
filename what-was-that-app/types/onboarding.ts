// Onboarding data types
export interface OnboardingData {
  onboardingComplete: boolean;
  sensorPaired: boolean;
  soundTypes: {
    smokeAlarm: boolean; // Always true, locked
    glassBreaking: boolean;
    doorbell: boolean; // Deprecated - users now record their own
    babyCrying: boolean; // Keep for backwards compatibility but not shown in UI
  };
  recordedSounds: {
    doorbell?: { audioId: string; audioUri: string };
  };
  delivery: {
    flashlight: boolean;
    vibration: boolean;
    overrideSilent: boolean;
  };
  emergencyContact: {
    name: string;
    phone: string;
  };
}

export const defaultOnboardingData: OnboardingData = {
  onboardingComplete: false,
  sensorPaired: false,
  soundTypes: {
    smokeAlarm: true, // Always on
    glassBreaking: true,
    doorbell: true,
    babyCrying: true,
  },
  recordedSounds: {},
  delivery: {
    flashlight: true,
    vibration: true,
    overrideSilent: true,
  },
  emergencyContact: {
    name: '',
    phone: '',
  },
};

