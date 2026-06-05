// Mock current user. Replace with Supabase `profiles` row (auth.uid) later.

export type UserRole = "user" | "agent";

export type CurrentUser = {
  id: string;
  name: string;
  avatar: string;
  role: UserRole;
};

export const currentUser: CurrentUser = {
  id: "u1",
  name: "Aysel Məmmədova",
  avatar:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=70",
  role: "agent",
};
