import { Router } from "express";
import commentRouter from "./comment.js";
import Post from "../models/posts.model.js"; // Post model
import Comment from "../models/comments.model.js"; // Comment model for potential cascading delete
import {
  isSameUserValidator, // Now used for author-specific protection
  isUserValidator,
} from "../validators/post.validator.js"; // Your validator file
import User from "../models/users.model.js";
import dotenv from "dotenv"; // Ensure dotenv is imported here

dotenv.config(); // Ensure dotenv is configured here

const router = Router();

// Mount the comment router for nested routes like /posts/:postId/comments
router.use("/:postId/comments", commentRouter);

// Route to get a single post by ID (Read) - Public, but now populates author
router.get("/:postId", async (req, res) => {
  try {
    const result = await Post.findById(req.params.postId).populate(
      "author",
      "username"
    ); // Only select username
    if (!result) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.json(result);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Route to get all posts with search and pagination (Read) - Public, but now populates author
router.get("/", async (req, res) => {
  const keyword = req.query.keyword;
  const page = Number(req.query.page);
  const pageSize = Number(req.query.pageSize);

  const skip = (page - 1) * pageSize;
  try {
    let findPosts;
    let total;

    if (!keyword) {
      total = await Post.countDocuments();
      findPosts = await Post.find()
        .populate("author", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize);
    } else {
      total = await Post.countDocuments({
        $or: [
          { title: { $regex: `.*${keyword}.*`, $options: "i" } },
          { content: { $regex: `.*${keyword}.*`, $options: "i" } },
        ],
      });

      findPosts = await Post.find({
        $or: [
          { title: { $regex: `.*${keyword}.*`, $options: "i" } },
          { content: { $regex: `.*${keyword}.*`, $options: "i" } },
        ],
      })
        .populate("author", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize);
    }

    res.json({
      data: findPosts,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Route to create a new post (Create) - PROTECTED (requires login, assigns author)
router.post("/", isUserValidator, async (req, res) => {
  const { title, content } = req.body;
  try {
    const createdPost = await Post.create({
      title,
      content,
      author: req.user._id, // Assign the ID of the logged-in user as the author
    });
    // Populate author field in the response so frontend immediately gets author details
    const populatedPost = await createdPost.populate("author", "username");
    await User.findByIdAndUpdate(req.user._id, {
      $push: { posts: populatedPost._id },
    });
    res.status(201).json(populatedPost);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(400).json({ message: error.message });
  }
});

// Route to update an existing post (Update) - PROTECTED (requires login AND user must be author)
router.put(
  "/:postId",
  isUserValidator, // Check if user is logged in
  isSameUserValidator, // Check if logged-in user is the author of the post
  async (req, res) => {
    const postId = req.params.postId;
    const { title, content } = req.body;

    try {
      const updatedPost = await Post.findOneAndUpdate(
        { _id: postId, author: req.user._id }, // Filter by postId AND author
        {
          title,
          content,
        },
        {
          new: true, // Return the updated document
          runValidators: true, // Run schema validators on update
        }
      ).populate("author", "username"); // Populate author for the response

      if (!updatedPost) {
        return res.status(404).json({
          message:
            "Post not found or you are not authorized to update this post",
        });
      }

      res.json(updatedPost);
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(400).json({ message: error.message });
    }
  }
);

// Route to delete a post (Delete) - PROTECTED (requires login AND user must be author)
router.delete(
  "/:postId",
  isUserValidator, // Check if user is logged in
  isSameUserValidator, // Check if logged-in user is the author of the post
  async (req, res) => {
    console.log("Inside DELETE /posts/:postId route.");
    console.log("req.user from authentication:", req.user);
    const postId = req.params.postId;
    try {
      const deletedPost = await Post.findOneAndDelete({
        _id: postId,
        author: req.user._id,
      });

      if (!deletedPost) {
        return res.status(404).json({
          message:
            "Post not found or you are not authorized to delete this post",
        });
      }
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { posts: req.params.postId },
      });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

export default router;
