import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import bcrypt from "bcrypt";
import User from "../models/users.model.js";
import dotenv from "dotenv"; // Re-added dotenv import

dotenv.config(); // Re-added dotenv.config() call here
console.log(
  "Passport.js - JWT_SECRET_KEY (from .env):",
  process.env.JWT_SECRET_KEY
);

const config = {
  usernameField: "email",
  passwordField: "password",
};

passport.use(
  new LocalStrategy(config, async function (email, password, done) {
    console.log("--- Passport Local Strategy Debug ---");
    console.log("Attempting login for email:", email);
    console.log("Password received (plain):", password);

    try {
      const user = await User.findOne({ email });
      if (!user) {
        console.log("Login Failed: User not found for email:", email);
        return done(null, false, { message: "User not found" });
      }
      console.log("User found:", user.username, " (ID:", user._id, ")");
      console.log("User's hashed password from DB:", user.password);

      const compareResult = await bcrypt.compare(password, user.password);
      console.log("Bcrypt compare result:", compareResult);

      if (!compareResult) {
        console.log("Login Failed: Wrong password for user:", email);
        return done(null, false, { message: "Wrong password" });
      }
      console.log("Login Successful for user:", email);
      return done(null, user); // Authentication successful
    } catch (err) {
      console.error("Error in Passport LocalStrategy:", err);
      return done(err); // Pass error to Passport
    } finally {
      console.log("--- End Passport Local Strategy Debug ---");
    }
  })
);

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req) => req.cookies.token || null,
  ]),
  secretOrKey: process.env.JWT_SECRET_KEY,
};
console.log(
  "Passport.js - JWT Strategy secretOrKey set to:",
  process.env.JWT_SECRET_KEY
);

passport.use(
  "jwt",
  new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
    console.log("JWT Strategy: Payload received:", jwt_payload);
    try {
      const foundUser = await User.findById(jwt_payload._id);
      if (!foundUser) {
        console.log("JWT Strategy: User not found for ID:", jwt_payload._id);
        return done(null, false, { message: "User not found" });
      }
      console.log("JWT Strategy: User found:", foundUser.username);
      return done(null, foundUser);
    } catch (err) {
      console.error("JWT Strategy: Error finding user:", err);
      return done(err);
    }
  })
);

const googleOption = {
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_SECRET,
  callbackURL: "http://localhost:3000/auth/login/google/callback",
};

passport.use(
  new GoogleStrategy(
    googleOption,
    async (assessToken, refreshToken, profile, done) => {
      try {
        const foundUser = await User.findOne({
          socialId: profile._json.sub,
          registerType: "google",
        });
        if (foundUser) {
          return done(null, foundUser);
        }
        const newUser = await User.create({
          email: profile._json.email,
          username: profile._json.name,
          socialId: profile._json.sub,
          registerType: "google",
        });
        return done(null, newUser);
      } catch (err) {
        return done(err);
      }
    }
  )
);

export default passport;
