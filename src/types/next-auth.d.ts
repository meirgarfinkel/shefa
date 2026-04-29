import type { DefaultSession } from "next-auth";
import type { Role } from "@/types/role";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role | null;
  }
}
