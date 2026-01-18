import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Home, Package, Clock, Settings } from "lucide-react-native";
import type { Screen } from "../../App"; // if this path breaks, see note below

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export default function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  const navItems: Array<{ id: Screen; icon: any; label: string }> = [
    { id: "home", icon: Home, label: "Home" },
    { id: "sounds", icon: Package, label: "Sounds" },
    { id: "history", icon: Clock, label: "History" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <View style={styles.container}>
      {navItems.map(({ id, icon: Icon, label }) => {
        const isActive = currentScreen === id;
        return (
          <Pressable
            key={id}
            onPress={() => onNavigate(id)}
            style={({ pressed }) => [
              styles.item,
              isActive && styles.itemActive,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Icon size={24} color={isActive ? COLORS.active : COLORS.inactive} strokeWidth={isActive ? 2.5 : 2} />
            <Text style={[styles.label, { color: isActive ? COLORS.active : COLORS.inactive }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const COLORS = {
  bg: "#FFFFFF",
  border: "#E0E0E0",
  active: "#4A6572", // Darker blue-gray for better contrast
  inactive: "#616161", // Darker for better contrast
  activeBg: "#F5F5F7",
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 60,
  },
  itemActive: {
    backgroundColor: COLORS.activeBg,
  },
  label: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
