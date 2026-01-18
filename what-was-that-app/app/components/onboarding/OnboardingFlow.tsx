import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import {
  OnboardingData,
  defaultOnboardingData,
} from "../../../types/onboarding";
import { saveOnboardingData } from "../../../utils/onboarding-storage";

import WelcomeStep from "./WelcomeStep";
import PersonaStep from "./PersonaStep";
import PairSensorStep from "./PairSensorStep";
import ChooseSoundTypesStep from "./ChooseSoundTypesStep";
import AlertDeliveryStep from "./AlertDeliveryStep";
import EmergencyContactStep from "./EmergencyContactStep";
import CompletionStep from "./CompletionStep";

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(
    defaultOnboardingData
  );

  useEffect(() => {
    console.log('📱 OnboardingFlow mounted, current step:', currentStep);
  }, []);

  useEffect(() => {
    console.log('📍 Step changed to:', currentStep);
  }, [currentStep]);

  // Total steps: 0=Welcome, 1=Persona, 2=Pair, 3=Sounds, 4=Delivery, 5=Contact, 6=Complete
  const totalSteps = 7;

  const handleBack = () => {
    console.log('⬅️ Back pressed, current step:', currentStep);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipAll = async () => {
    console.log('⏩ Skip all pressed - saving defaults');
    // Save defaults and mark complete
    const completeData = { ...defaultOnboardingData, onboardingComplete: true };
    await saveOnboardingData(completeData);
    console.log('✅ Data saved, calling onComplete callback');
    onComplete();
  };

  const handleNext = async () => {
    console.log('➡️ Next pressed, current step:', currentStep);
    const nextStep = currentStep + 1;
    if (nextStep >= totalSteps) {
      // Final step - mark complete and save
      console.log('🎉 Final step reached - marking onboarding complete');
      const completeData = { ...onboardingData, onboardingComplete: true };
      console.log('💾 Saving onboarding data:', JSON.stringify(completeData, null, 2));
      await saveOnboardingData(completeData);
      console.log('✅ Data saved, calling onComplete callback');
      onComplete();
    } else {
      console.log('📍 Moving to step:', nextStep);
      setCurrentStep(nextStep);
    }
  };

  const handleFirstNameChange = (firstName: string) => {
    setOnboardingData({ ...onboardingData, firstName });
    handleNext(); // Move to next step after saving first name
  };

  const handleSensorPaired = (paired: boolean) => {
    setOnboardingData({ ...onboardingData, sensorPaired: paired });
  };

  const handleSoundTypesChange = (
    soundTypes: OnboardingData["soundTypes"]
  ) => {
    setOnboardingData({ ...onboardingData, soundTypes });
  };

  const handleRecordedSoundsChange = (recordedSounds: OnboardingData["recordedSounds"]) => {
    console.log('🔄 OnboardingFlow: handleRecordedSoundsChange called');
    console.log('  recordedSounds:', JSON.stringify(recordedSounds, null, 2));
    const updatedData = { ...onboardingData, recordedSounds };
    console.log('  Updated onboardingData:', JSON.stringify(updatedData, null, 2));
    setOnboardingData(updatedData);
  };

  const handleDeliveryChange = (delivery: OnboardingData["delivery"]) => {
    setOnboardingData({ ...onboardingData, delivery });
  };

  const handleEmergencyContactChange = (
    emergencyContact: OnboardingData["emergencyContact"]
  ) => {
    setOnboardingData({ ...onboardingData, emergencyContact });
  };

  const renderProgressIndicator = () => {
    // Don't show on welcome or completion screens
    if (currentStep === 0 || currentStep === totalSteps - 1) {
      return null;
    }

    // Steps 1-5 (index 1-5)
    const progressSteps = [1, 2, 3, 4, 5];
    const activeProgressStep = currentStep;

    return (
      <View style={styles.progressContainer}>
        {progressSteps.map((step) => (
          <View
            key={step}
            style={[
              styles.progressDot,
              step <= activeProgressStep && styles.progressDotActive,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderStep = () => {
    console.log('🎬 Rendering step:', currentStep);
    const stepProps = {
      onNext: handleNext,
      onBack: handleBack,
      showBack: currentStep > 0 && currentStep < 6, // Show back button except on welcome and completion
    };
    
    switch (currentStep) {
      case 0:
        console.log('🎬 Returning WelcomeStep component');
        return <WelcomeStep onNext={handleNext} onSkip={handleSkipAll} />;
      case 1:
        return (
          <PersonaStep
            initialFirstName={onboardingData.firstName}
            onNext={handleFirstNameChange}
            onBack={handleBack}
          />
        );
      case 2:
        return (
          <PairSensorStep
            {...stepProps}
            onSensorPaired={handleSensorPaired}
          />
        );
      case 3:
        return (
          <ChooseSoundTypesStep
            {...stepProps}
            soundTypes={onboardingData.soundTypes}
            onSoundTypesChange={handleSoundTypesChange}
            recordedSounds={onboardingData.recordedSounds}
            onRecordedSoundsChange={handleRecordedSoundsChange}
          />
        );
      case 4:
        return (
          <AlertDeliveryStep
            {...stepProps}
            delivery={onboardingData.delivery}
            onDeliveryChange={handleDeliveryChange}
          />
        );
      case 5:
        return (
          <EmergencyContactStep
            {...stepProps}
            emergencyContact={onboardingData.emergencyContact}
            onEmergencyContactChange={handleEmergencyContactChange}
          />
        );
      case 6:
        return <CompletionStep onFinish={handleNext} />;
      default:
        return <WelcomeStep onNext={handleNext} onSkip={handleSkipAll} />;
    }
  };

  const step = renderStep();
  console.log('🎨 Step component:', step ? 'exists' : 'null');
  
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      {/* Back button - show on steps 1-5 */}
      {currentStep > 0 && currentStep < 6 && (
        <Pressable 
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={10}
        >
          <ArrowLeft size={24} color="#1F1F1F" />
        </Pressable>
      )}
      
      {renderProgressIndicator()}
      <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
        {step}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F5F7" },
  container: { flex: 1, backgroundColor: "#F5F5F7" },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 24,
    zIndex: 100,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0E0E0",
  },
  progressDotActive: {
    backgroundColor: "#4A6572", // Darker for better contrast
    width: 24,
  },
});

