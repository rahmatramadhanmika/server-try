import mongoose from "mongoose";
import app from "./app.js";

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017/express-test";
mongoose
  .connect(mongoUrl)
  .then(() => {
    console.log("database connected");
    app.listen(3000, () => {
      console.log("server is running on localhost:3000");
    });
  })
  .catch((e) => {
    console.log("error: ", e.message);
  });
