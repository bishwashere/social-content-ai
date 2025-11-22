import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { requestValidator } from "@/middlewares/request-validator";
import { referralValidator, ReferralValidatorType } from "@/validators/referral";
import { generateJWT } from "@/lib/jwt";
import { comparePassword } from "@/lib/referral";

/**
 * Referral partner login
 */
export const POST = applyMiddleware(
  requestValidator.validateBody(referralValidator.partnerLogin),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: parsed is not defined in Request type
    const { username, password } = req.parsed
      .body as ReferralValidatorType["partnerLogin"];

    const partner = await prisma.referralPartner.findUnique({
      where: { username },
    });

    if (!partner) {
      return sendNextResponse({
        status: 401,
        message: "Invalid credentials",
      });
    }

    const isPasswordValid = await comparePassword(password, partner.password);

    if (!isPasswordValid) {
      return sendNextResponse({
        status: 401,
        message: "Invalid credentials",
      });
    }

    const jwt = generateJWT(
      { id: partner.id, email: partner.email },
      process.env.JWT_SECRET as string
    );

    return sendNextResponse({
      message: "Login successful",
      status: 200,
      data: {
        bearerToken: jwt,
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          code: partner.code,
        },
        role: "referral_partner",
      },
    });
  })
);
