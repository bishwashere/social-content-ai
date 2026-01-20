import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { GoogleOauth } from "@/lib/google-ouath";
import { generateJWT } from "@/lib/jwt";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";

import { requestValidator } from "@/middlewares/request-validator";
import { authValidator, AuthValidatorType } from "@/validators/auth";
import axios from "axios";

/**
 * Continue with Google, create a new user or update the existing user
 * with the given data.
 */
export const POST = applyMiddleware(
  requestValidator.validateBody(authValidator.continueWithGoogle),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: credential is not defined
    const { credential } = req.parsed
      .body as AuthValidatorType["continueWithGoogle"];

    const user = new GoogleOauth(credential);

    const userProfile = await user.getUserProfile();

    const existingUser = await prisma.user.findFirst({
      where: { email: userProfile.email },
    });
    const isNewUser = !existingUser;

    /**
     * 1. Find the user with the given email
     * 2. Update the user with new data
     *    2.1 If the user does not exist create a new user
     * 3. Return the updated user.
     */

    const savedUser = await prisma.user.upsert({
      where: { email: userProfile.email },
      update: {
        avatarUrl: userProfile.picture,
        name: userProfile.name,
        idFromProvider: userProfile.id,
        updatedAt: new Date(),
      },
      create: {
        email: userProfile.email,
        avatarUrl: userProfile.picture,
        name: userProfile.name,
        idFromProvider: userProfile.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (!savedUser) {
      console.error("❌ Error saving user to DB:");
      return sendNextResponse({
        status: 400,
        message: "Failed to save user",
      });
    }

    if (isNewUser) {
      console.log(`New user signup: ${savedUser.email}`);
      
      // Track referral signup if referral username exists
      try {
        const { cookies } = await import("next/headers");
        const cookieStore = cookies();
        const referralUsername = cookieStore.get("referral_username")?.value;
        
        if (referralUsername) {
          const partner = await prisma.referralPartner.findUnique({
            where: { username: referralUsername },
          });
          
          if (partner) {
            // Check if user already signed up through a referral
            const existingSignup = await prisma.referralSignup.findUnique({
              where: { userId: savedUser.id },
            });
            
            if (!existingSignup) {
              await prisma.referralSignup.create({
                data: {
                  referralPartnerId: partner.id,
                  userId: savedUser.id,
                },
              });
              console.log(`✅ Referral signup tracked for partner: ${partner.name}`);
            }
          }
        }
      } catch (error) {
        console.error("❌ Error tracking referral signup:", error);
      }
      
      try {
        const res = await axios.post(
          process.env.TRAXN_WORKFLOW_SIGNUP_INBOUND_WEBHOOK_URL as string,
          {
            email: savedUser.email,
            name: savedUser.name,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const data = await res.data;
        console.log("✅ Signup email sent to Traxn successfully:", data);
      } catch (error) {
        console.error("❌ Error sending signup email to Traxn:", error);
      }

      try {
        const res = await axios.post(
          process.env.TRAXN_WORKFLOW_ABANDON_INBOUND_WEBHOOK_URL as string,
          {
            email: savedUser.email,
            name: savedUser.name,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        const data = await res.data;
        console.log("✅ Abandon email sent to Traxn successfully:", data);
      } catch (error) {
        console.error("❌ Error sending abandon email to Traxn:", error);
      }
    }

    console.log("🔑 Generating JWT token for user:", savedUser.id);
    const jwt = generateJWT(
      { id: savedUser.id, email: savedUser.email },
      process.env.JWT_SECRET as string
    );

    console.log("📤 Returning response with token:", jwt ? "Yes" : "No", jwt);

    const subscription = await prisma.subscription.findMany({
      where: { userId: savedUser.id },
    });

    return sendNextResponse({
      message: `Welcome, ${userProfile.name}`,
      status: 200,
      data: {
        user: savedUser,
        bearerToken: jwt,
        subscription,
      },
    });
  })
);
