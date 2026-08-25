import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

export type CoordSession = { unlocked?: boolean };

export function getSessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "coord-gate",
    maxAge: 60 * 60 * 12,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      path: "/",
    },
  };
}

export function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export async function getCoordSession() {
  return useSession<CoordSession>(getSessionConfig());
}

export async function requireCoord() {
  const session = await getCoordSession();
  if (!session.data.unlocked) {
    throw new Error("Acesso restrito. Entre com a senha de coordenador.");
  }
  return session;
}

export async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
