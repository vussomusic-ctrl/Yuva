// Stock photos for the Add Listing flow. On web a real file picker may not work,
// so "Add photo" pulls the next unused image from this set — the flow never
// breaks. Swap for expo-image-picker + Supabase storage uploads later.

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=640&q=70`;

export const stockListingPhotos: string[] = [
  img("1502672260266-1c1ef2d93688"),
  img("1493809842364-78817add7ffb"),
  img("1586023492125-27b2c045efd7"),
  img("1512917774080-9991f1c4c750"),
  img("1560448204-e02f11c3d0e2"),
  img("1568605114967-8130f3a36994"),
  img("1484154218962-a197022b5858"),
  img("1505691938895-1758d7feb511"),
];
