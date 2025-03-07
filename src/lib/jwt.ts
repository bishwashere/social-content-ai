import jwt from "jsonwebtoken";

export type TokenPayload = {
  _id: string;
  email: string;
};

/**
 *
 * @param payload The payload to be signed
 * @param secret secret key to sign the payload
 * @returns  A signed token
 */
export const generateJWT = (payload: TokenPayload, secret: string) => {
  return jwt.sign(payload, secret, { expiresIn: "7d" });
};

/**
 *
 * @param token The token to be verified
 * @param secret The secret key to verify the token
 * @returns The decoded token
 */
export const verifyJWT = (token: string, secret: string) => {
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    return null;
  }
};
