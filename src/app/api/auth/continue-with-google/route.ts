import { db } from "@/db";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { GoogleOauth } from "@/lib/google-ouath";
import { generateJWT } from "@/lib/jwt";
import { sendNextResponse } from "@/lib/send-next-response";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { validateBody } from "@/middlewares/request-validator";
import { authValidator, AuthValidatorType } from "@/validators/auth";

export const POST = applyMiddleware(
  connectToDBMiddleware(),
  validateBody(authValidator.continueWithGoogle),
  catchApiAsyncError(async (req) => {
    const { credential } = req.parsed
      .body as AuthValidatorType["continueWithGoogle"];

    const user = new GoogleOauth(credential);

    const userProfile = await user.getUserProfile();

    const savedUser = await db.auth.saveUser({
      avatarUrl: userProfile.picture,
      email: userProfile.email,
      name: userProfile.name,
      idFromProvider: userProfile.id,
    });

    if (!savedUser.ok) {
      console.error("❌ Error saving user to DB:");
      return {
        status: 400,
        message: savedUser.error,
      };
    }

    console.log(
      "🔑 Generating JWT token for user:",
      savedUser.data._id.toString()
    );
    const jwt = generateJWT(
      { _id: savedUser.data._id.toString(), email: savedUser.data.email },
      process.env.JWT_SECRET as string
    );

    console.log("📤 Returning response with token:", jwt ? "Yes" : "No", jwt);

    return sendNextResponse({
      message: `Welcome, ${userProfile.name}`,
      status: 200,
      data: {
        user: savedUser.data,
        bearerToken: jwt,
      },
    });
  })
);
