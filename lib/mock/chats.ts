// Mock conversations for the Messages tab. Replace with Supabase
// `conversations` + `messages` (realtime) later.
//
// Peer names and message bodies are user-generated content (Azerbaijani) and are
// NOT translated. Times are stored as language-neutral strings (clock / date).

export type ChatMessage = {
  id: string;
  fromMe: boolean;
  body: string;
  time: string;
};

export type Chat = {
  id: string;
  peerName: string;
  peerAvatar: string;
  // Listing this conversation is about.
  listingId: string;
  listingTitle: string;
  unread: number;
  // Preview timestamp shown in the chat list.
  lastTime: string;
  messages: ChatMessage[];
};

const avatar = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=200&q=70`;

export const chats: Chat[] = [
  {
    id: "c1",
    peerName: "Rəşad Əliyev",
    peerAvatar: avatar("1507003211169-0a1dd7228f2d"),
    listingId: "1",
    listingTitle: "Nizami rayonu, 3 otaqlı mənzil",
    unread: 2,
    lastTime: "14:32",
    messages: [
      { id: "m1", fromMe: false, body: "Salam! Elan hələ də aktualdır?", time: "14:20" },
      { id: "m2", fromMe: true, body: "Salam, bəli, aktualdır.", time: "14:22" },
      { id: "m3", fromMe: false, body: "Baxış üçün sabah uyğundur?", time: "14:30" },
      { id: "m4", fromMe: false, body: "Saat 18:00 olar?", time: "14:32" },
    ],
  },
  {
    id: "c2",
    peerName: "Günel Hüseynova",
    peerAvatar: avatar("1438761681033-6461ffad8d80"),
    listingId: "3",
    listingTitle: "Yasamal rayonu, 2 otaqlı mənzil",
    unread: 0,
    lastTime: "12.05",
    messages: [
      { id: "m1", fromMe: false, body: "Qiymətdə güzəşt mümkündür?", time: "11:02" },
      { id: "m2", fromMe: true, body: "Razılaşa bilərik, baxışdan sonra.", time: "11:15" },
      { id: "m3", fromMe: false, body: "Çox sağ olun, əlaqə saxlayaram.", time: "11:18" },
    ],
  },
  {
    id: "c3",
    peerName: "Elvin Quliyev",
    peerAvatar: avatar("1500648767791-00dcc994a43e"),
    listingId: "5",
    listingTitle: "Mərdəkanda həyət evi, 4 otaq",
    unread: 1,
    lastTime: "10:40",
    messages: [
      { id: "m1", fromMe: true, body: "Salam, həyətin sahəsi nə qədərdir?", time: "10:05" },
      { id: "m2", fromMe: false, body: "Salam, 6 sotdur.", time: "10:38" },
      { id: "m3", fromMe: false, body: "İstəsəniz video göndərə bilərəm.", time: "10:40" },
    ],
  },
  {
    id: "c4",
    peerName: "Nigar Səfərova",
    peerAvatar: avatar("1534528741775-53994a69daeb"),
    listingId: "2",
    listingTitle: "Xəzər rayonu, Villa",
    unread: 0,
    lastTime: "03.05",
    messages: [
      { id: "m1", fromMe: false, body: "İpoteka ilə satışı nəzərdən keçirirsiniz?", time: "09:10" },
      { id: "m2", fromMe: true, body: "Bəli, banklarla işləyirik.", time: "09:24" },
    ],
  },
];

export const getChat = (id: string): Chat | undefined => chats.find((c) => c.id === id);
