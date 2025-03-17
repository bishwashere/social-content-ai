import { UserDoc, UserModel } from "@/db/auth/schema/user";
import { SubscriptionModel } from "@/db/subscriptions/schema/subscription";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { GoogleOauth } from "@/lib/google-ouath";
import { generateJWT } from "@/lib/jwt";
import { mail } from "@/lib/mail";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { requestValidator } from "@/middlewares/request-validator";
import { authValidator, AuthValidatorType } from "@/validators/auth";

/**
 * Continue with Google, create a new user or update the existing user
 * with the given data.
 */
export const POST = applyMiddleware(
  connectToDBMiddleware(),
  requestValidator.validateBody(authValidator.continueWithGoogle),
  catchApiAsyncError(async (req) => {
    //@ts-expect-error: credential is not defined
    const { credential } = req.parsed
      .body as AuthValidatorType["continueWithGoogle"];

    const user = new GoogleOauth(credential);

    const userProfile = await user.getUserProfile();

    const existingUser = await UserModel.findOne({ email: userProfile.email });
    const isNewUser = !existingUser;

    /**
     * 1. Find the user with the given email
     * 2. Update the user with new data
     *    2.1 If the user does not exist create a new user
     * 3. Return the updated user.
     */

    const savedUser: UserDoc = await UserModel.findOneAndUpdate(
      { email: userProfile.email },
      {
        $set: {
          avatarUrl: userProfile.picture,
          email: userProfile.email,
          name: userProfile.name,
          idFromProvider: userProfile.id,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      }
    );

    if (!savedUser) {
      console.error("❌ Error saving user to DB:");
      return {
        status: 400,
        message: "Failed to save user",
      };
    }

    if (isNewUser) {
      Promise.resolve(
        mail.sendTemplate(
          "WELCOME_ON_LOGIN",
          {
            name: userProfile.name,
            activationLink: process.env.NEXT_PUBLIC_FRONTEND_BASE_URL as string,
          },
          {
            subject: `Welcome to NextPost AI, ${userProfile.name}!`,
            to: [userProfile.email],
          }
        )
      );
    }

    console.log("🔑 Generating JWT token for user:", savedUser._id.toString());
    const jwt = generateJWT(
      { _id: savedUser._id.toString(), email: savedUser.email },
      process.env.JWT_SECRET as string
    );

    console.log("📤 Returning response with token:", jwt ? "Yes" : "No", jwt);

    const subscription = await SubscriptionModel.find({
      userId: savedUser._id,
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
