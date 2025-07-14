// post.validator.js
import Post from "../models/posts.model.js"; // Correct path for import

export async function isUserValidator(req, res, next) {
  if (!req.user) {
    // If the user is not authenticated, send a 401 Unauthorized response
    // and explicitly RETURN to stop further execution for this request.
    return res.status(401).json({ message: "Not Authorized" });
  }
  // If the user is authenticated, proceed to the next middleware or route handler.
  next();
}

export async function isSameUserValidator(req, res, next) {
  const user = req.user;
  if (!user) {
    // This check is good for robustness, though isUserValidator should catch it first.
    return res.status(401).json({ message: "Not Authorized" });
  }

  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Add a check to ensure post.author is not null or undefined
    if (!post.author) {
      console.error(
        `Post ${req.params.postId} found but has no author assigned.`
      );
      return res.status(403).json({
        message: "Post has no assigned author or you are not authorized.",
      });
    }

    // Correctly compare ObjectIds: post.author is already an ObjectId
    // user._id is also an ObjectId. Use .equals() for comparison.
    if (!post.author.equals(user._id)) {
      return res
        .status(403)
        .json({ message: "Not Authorized to perform this action" });
    }

    next();
  } catch (error) {
    // Catch any potential errors during database lookup (e.g., invalid postId format)
    console.error("Error in isSameUserValidator:", error);
    if (error.name === "CastError" && error.kind === "ObjectId") {
      return res.status(400).json({ message: "Invalid Post ID format" });
    }
    return res
      .status(500)
      .json({ message: "Server Error during authorization check" });
  }
}
