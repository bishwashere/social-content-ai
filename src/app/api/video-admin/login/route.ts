import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { requestValidator } from "@/middlewares/request-validator";
import { z } from "zod";
import { generateJWT } from "@/lib/jwt";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Video Admin login
 */
export const POST = applyMiddleware(
  requestValidator.validateBody(loginSchema),
  catchApiAsyncError(async (req) => {
    // @ts-expect-error: parsed is not defined in Request type
    const { username, password } = req.parsed.body;

    const adminUsername = process.env.VIDEO_ADMIN_USERNAME;
    const adminPassword = process.env.VIDEO_ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      return sendNextResponse({
        status: 500,
        message: "Video Admin credentials not configured",
      });
    }

    if (username !== adminUsername || password !== adminPassword) {
      return sendNextResponse({
        status: 401,
        message: "Invalid credentials",
      });
    }

    const jwt = generateJWT(
      { id: "video_admin", email: "video-admin@nextpostai.com" },
      process.env.JWT_SECRET as string
    );

    return sendNextResponse({
      message: "Login successful",
      status: 200,
      data: {
        bearerToken: jwt,
        role: "video_admin",
      },
    });
  })
);
