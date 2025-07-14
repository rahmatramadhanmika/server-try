import { Router } from "express";
import Comment from "../models/comments.model.js"; // Based on your previous router import path
import Post from "../models/posts.model.js"; // Import the Post model to update its comments array
import { isUserValidator } from "../validators/post.validator.js"; // Assuming you have a validator to check if user is logged in

// Initialize the router with mergeParams: true to inherit params from parent routers (e.g., postId)
const router = Router({ mergeParams: true });

// Route to get comments for a specific post with infinite scroll/pagination (Read)
router.get("/", async (req, res) => {
  const postId = req.params.postId; // Correctly captured due to mergeParams: true
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 10;

  const skip = (page - 1) * pageSize;

  try {
    const total = await Comment.countDocuments({ post: postId });
    const findComments = await Comment.find({ post: postId })
      // --- NEW: Populate the 'author' field to include user details (e.g., username) ---
      .populate("author", "username") // Only select username
      // --- END NEW ---
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 }); // Sort by creation date for consistent infinite scroll

    res.json({
      data: findComments,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Route to create a new comment for a post (Create) - PROTECTED (requires login)
router.post("/", isUserValidator, async (req, res) => {
  // Add isUserValidator here
  const postId = req.params.postId; // Correctly captured
  const { content } = req.body;

  try {
    const createdComment = await Comment.create({
      content,
      post: postId, // Link comment to the post
      author: req.user._id, // --- NEW: Assign the ID of the logged-in user as the author ---
    });

    // Populate author field in the response so frontend immediately gets author details
    const populatedComment = await createdComment.populate(
      "author",
      "username"
    ); // Populate author for response

    // Update the Post document by pushing the new comment's _id into its 'comments' array
    await Post.findByIdAndUpdate(
      postId,
      { $push: { comments: populatedComment._id } }, // Use populatedComment._id
      { new: true, runValidators: true }
    );

    res.status(201).json(populatedComment); // Send populated comment
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(400).json({ message: error.message }); // Send validation errors to frontend
  }
});

// Route to update a comment (Update)
router.put("/:commentId", async (req, res) => {
  const commentId = req.params.commentId;
  const postId = req.params.postId; // Available from mergeParams
  const { content } = req.body;

  try {
    // Find and update the comment, ensuring it belongs to the correct post
    const updatedComment = await Comment.findOneAndUpdate(
      { _id: commentId, post: postId }, // Filter by commentId AND postId
      { content },
      { new: true, runValidators: true } // Return the updated document and run schema validators
    )
      // --- NEW: Populate author for update response ---
      .populate("author", "username");
    // --- END NEW ---

    if (!updatedComment) {
      return res
        .status(404)
        .json({ message: "Comment not found or does not belong to this post" });
    }
    res.json(updatedComment);
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(400).json({ message: error.message });
  }
});

// Route to delete a comment (Delete)
router.delete("/:commentId", async (req, res) => {
  const commentId = req.params.commentId;
  const postId = req.params.postId; // Available from mergeParams

  try {
    // Find and delete the comment, ensuring it belongs to the correct post
    const deletedComment = await Comment.findOneAndDelete({
      _id: commentId,
      post: postId,
    });

    if (!deletedComment) {
      return res
        .status(404)
        .json({ message: "Comment not found or does not belong to this post" });
    }

    // Update the Post document by pulling the deleted comment's _id from its 'comments' array
    await Post.findByIdAndUpdate(
      postId,
      { $pull: { comments: commentId } },
      { new: true, runValidators: true }
    );

    res.status(204).send(); // 204 No Content for successful deletion
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
