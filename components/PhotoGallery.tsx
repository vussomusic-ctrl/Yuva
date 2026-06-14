import { useState, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { font } from "../lib/theme/typography";

type Props = {
  visible: boolean;
  photos: string[];
  initialIndex: number;
  onClose: () => void;
};

export function PhotoGallery({ visible, photos, initialIndex, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(initialIndex);
  const readyRef = useRef(false);

  // On each open: reset to the tapped photo, hold onScroll until positioned.
  useEffect(() => {
    if (visible) {
      readyRef.current = false;
      setPage(initialIndex);
    }
  }, [visible, initialIndex]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!readyRef.current) return;
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onLayout={() => {
            // Position at the tapped photo once layout is known, then enable onScroll.
            scrollRef.current?.scrollTo({ x: initialIndex * width, y: 0, animated: false });
            requestAnimationFrame(() => {
              readyRef.current = true;
            });
          }}
        >
          {photos.map((uri, i) => (
            <View key={i} style={{ width, height, justifyContent: "center" }}>
              <Image
                source={{ uri }}
                style={{ width, height }}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* Counter top-center */}
        {photos.length > 1 && (
          <View
            style={{
              position: "absolute",
              top: insets.top + 12,
              left: 0,
              right: 0,
              alignItems: "center",
            }}
            pointerEvents="none"
          >
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: "rgba(0,0,0,0.5)",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 14, fontFamily: font.medium }}>
                {page + 1} / {photos.length}
              </Text>
            </View>
          </View>
        )}

        {/* Close button top-right */}
        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={{
            position: "absolute",
            top: insets.top + 8,
            right: 16,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}
