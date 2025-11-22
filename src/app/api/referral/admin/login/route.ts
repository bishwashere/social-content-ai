import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { requestValidator } from "@/middlewares/request-validator";
import { referralValidator, ReferralValidatorType } from "@/validators/referral";
import { generateJWT } from "@/lib/jwt";

/**
 * Super admin login
 */
export const POST = applyMiddleware(
  requestValidator.validateBody(referralValidator.superAdminLogin),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: parsed is not defined in Request type
    const { username, password } = req.parsed
      .body as ReferralValidatorType["superAdminLogin"];

    const superAdminUsername = process.env.REFERRAL_SUPER_ADMIN_USERNAME;
    const superAdminPassword = process.env.REFERRAL_SUPER_ADMIN_PASSWORD;

    if (!superAdminUsername || !superAdminPassword) {
      return sendNextResponse({
        status: 500,
        message: "Super admin credentials not configured",
      });
    }

    if (username !== superAdminUsername || password !== superAdminPassword) {
      return sendNextResponse({
        status: 401,
        message: "Invalid credentials",
      });
    }

    const jwt = generateJWT(
      { id: "super_admin", email: "admin@nextpostai.com" },
      process.env.JWT_SECRET as string
    );

    return sendNextResponse({
      message: "Login successful",
      status: 200,
      data: {
        bearerToken: jwt,
        role: "super_admin",
      },
    });
  })
);
