import express from "express";
import helloRouter from "./hello.js";
import postRouter from "./routers/post.js";
import userRouter from "./routers/user.js";
import cors from "cors";
import session from "express-session";
import MongStore from "connect-mongo";
import passport from "./config/passport.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

dotenv.config(); // Ensure this is called only once at the top-level entry point

const app = express();
app.use(cookieParser());
app.use(
  cors({
    origin: "https://sonervous.site/", // Your frontend origin
    credentials: true, // Allow cookies to be sent with cross-origin requests
  })
);
app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log("Incoming request for path:", req.path);
  console.log("Token cookie:", req.cookies["token"]);

  if (req.path === "/auth/google/callback") {
    console.log("Skipping JWT authentication for Google OAuth callback.");
    return next(); // Proceed to the next middleware (Passport's Google strategy)
  }

  if (!req.cookies["token"]) {
    console.log("No token cookie found, proceeding to next middleware.");
    return next();
  }
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      console.error("Passport JWT authentication error:", err);
      // Log the specific JWT error message
      if (err.name === "JsonWebTokenError") {
        console.error("JWT Error details:", err.message);
      }
      // Corrected: Replaced optional chaining with a conditional check
      return res.status(401).json({
        message:
          (info && info.message) ||
          err.message ||
          "Unauthorized: Invalid token.",
      });
    }
    if (!user) {
      console.log("Passport JWT authentication failed: No user found.", info);
      // Corrected: Replaced optional chaining with a conditional check
      return res.status(401).json({
        message: (info && info.message) || "Unauthorized: Invalid token.",
      });
    }
    req.user = user;
    console.log(
      "Passport JWT authentication successful. req.user:",
      req.user.username
    );
    next();
  })(req, res, next);
});

app.use("/posts", postRouter);
app.use("/auth", userRouter);

app.get("/users/current_user", (req, res) => {
  if (req.user) {
    const userToSend = {
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      isAdmin: req.user.isAdmin,
      registerType: req.user.registerType,
    };
    res.json({ user: userToSend });
  } else {
    res.status(401).json({ message: "No authenticated user." });
  }
});

app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

export default app;
