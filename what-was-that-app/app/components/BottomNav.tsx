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
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Icon size={22} color={isActive ? COLORS.active : COLORS.inactive} />
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
  border: "#15151C",
  active: "#3B82F6",
  inactive: "#A0A0AA",
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  item: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },
});
