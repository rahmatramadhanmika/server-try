import mongoose, { Schema } from "mongoose";

const CommentSchema = new Schema(
  {
    content: {
      type: String,
      required: true,
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true, // This ensures every comment must be linked to a Post
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Ensure every comment has an author
      index: true, // Add an index for efficient lookups
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

const Comment = mongoose.model("Comment", CommentSchema);
export default Comment;
