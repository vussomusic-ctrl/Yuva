import { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { get, ONBOARDING_SEEN } from "../lib/storage";

export default function IndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    get(ONBOARDING_SEEN).then((v) => {
      router.replace(v === "1" ? "/welcome" : "/onboarding");
    });
  }, []);

  return <View style={{ flex: 1, backgroundColor: "#8A3BB5" }} />;
}
