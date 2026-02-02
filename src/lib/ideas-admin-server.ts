import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/jwt";
import { IDEAS_ADMIN_TOKEN_COOKIE_NAME } from "@/constants/common";

/** Check if the current request has valid ideas-admin auth (cookie). Use in server components. */
export async function isIdeasAdminRequest(): Promise<boolean> {
  const secret = process.env.JWT_SECRET;
  if (!secret) return false;

  const cookieStore = await cookies();
  const token =
    cookieStore.get(IDEAS_ADMIN_TOKEN_COOKIE_NAME)?.value ?? "";

  if (!token) return false;

  const payload = verifyJWT(token, secret);
  return payload?.id === "ideas_admin";
}
