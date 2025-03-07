import { Err, Ok } from "ts-res";
import { SaveUserProps } from "./types";
import { User, UserModel } from "./schema/user";
class Auth {
  /**
   * Create a new user or update the existing user with the given data.
   */
  async saveUser(data: SaveUserProps) {
    try {
      /**
       * 1. Find the user with the given email
       * 2. Update the user with new data
       *    2.1 If the user does not exist create a new user
       * 3. Return the updated user.
       */

      const user: User = await UserModel.findOneAndUpdate(
        { email: data.email },
        {
          $set: {
            ...data,
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

      return Ok(user);
    } catch (e) {
      console.error("Failed to login!", e);

      return Err("Failed to login!");
    }
  }

  /**
   * Find a user with the given query.
   */
  async findUser(query: Partial<User>) {
    try {
      const user = await UserModel.findOne(query);
      return Ok(user);
    } catch (e) {
      console.error("Failed to find user!", e);

      return Err("Failed to find user!");
    }
  }
}

export const auth = new Auth();
