import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../lib/theme/ThemeContext";

export default function AddScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "600" }}>
        {t("tabs.add")}
      </Text>
    </View>
  );
}
