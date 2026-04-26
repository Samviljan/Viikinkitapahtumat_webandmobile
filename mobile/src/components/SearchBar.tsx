import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/lib/theme";

interface Props {
  value: string;
  onChangeText: (s: string) => void;
  placeholder: string;
  testID?: string;
}

export function SearchBar({ value, onChangeText, placeholder, testID }: Props) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="search" size={16} color={colors.stone} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.stone}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value ? (
        <Ionicons
          name="close-circle"
          size={16}
          color={colors.stone}
          onPress={() => onChangeText("")}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.edge,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    color: colors.bone,
    fontSize: 15,
    padding: 0,
  },
});
