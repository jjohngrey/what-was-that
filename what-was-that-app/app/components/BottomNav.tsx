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
  bg: "#000000",
  border: "#333333",
  active: "#FFFFFF",
  inactive: "#666666",
  activeBg: "#1A1A1A",
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
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
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
