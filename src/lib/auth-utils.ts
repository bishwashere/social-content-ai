/**
 * Centralized authentication utility functions
 * Shared auth logic for API routes
 */

import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * User data returned from authentication
 */
export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

/**
 * Get the authenticated user from a request
 * Checks both Authorization header and cookie
 * 
 * @param request - The Next.js request object
 * @returns The authenticated user
 * @throws AuthenticationError if authentication fails
 */
export async function getUserFromToken(
  request: NextRequest
): Promise<AuthenticatedUser> {
  // Check Authorization header first (from axios/fetch)
  const authHeader = request.headers.get("authorization");
  let token = authHeader?.replace("Bearer ", "");

  // Fallback to cookie if no Authorization header
  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value;
  }

  if (!token) {
    throw new AuthenticationError("No authentication token found");
  }

  const payload = verifyJWT(token, process.env.JWT_SECRET as string);
  if (!payload) {
    throw new AuthenticationError("Invalid authentication token");
  }

  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    throw new AuthenticationError("User not found");
  }

  return user;
}

/**
 * Check if an error is an authentication error
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Create a standard authentication error response
 */
export function createAuthErrorResponse(error: unknown) {
  if (isAuthenticationError(error)) {
    return {
      error: error.message,
      status: 401,
    };
  }
  return {
    error: "Internal server error",
    status: 500,
  };
}
