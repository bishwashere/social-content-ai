import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { generateJWT } from "@/lib/jwt";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";

import { requestValidator } from "@/middlewares/request-validator";
import { authValidator, AuthValidatorType } from "@/validators/auth";

/**
 * Continue with Google, create a new user or update the existing user
 * with the given data.
 */
export const POST = applyMiddleware(
  requestValidator.validateBody(authValidator.emailLogin),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: email and password are not defined
    const { email, password } = req.parsed
      .body as AuthValidatorType["emailLogin"];

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      return sendNextResponse({
        status: 400,
        message: "User not found, please sign up first",
      });
    }

    if (!user.password) {
      return sendNextResponse({
        status: 400,
        message: "Password not set, please sign up or reset password first",
      });
    }

    if (user.password !== password) {
      return sendNextResponse({
        status: 400,
        message: "Invalid credentials",
      });
    }

    console.log("🔑 Generating JWT token for user:", user.id);
    const jwt = generateJWT(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET as string
    );

    console.log("📤 Returning response with token:", jwt ? "Yes" : "No", jwt);

    const subscription = await prisma.subscription.findMany({
      where: { userId: user.id },
    });

    return sendNextResponse({
      message: `Welcome, ${user.name}`,
      status: 200,
      data: {
        user: user,
        bearerToken: jwt,
        subscription,
      },
    });
  })
);
