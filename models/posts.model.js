import mongoose, { Schema } from "mongoose";

const PostSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }], // This array stores ObjectIds of associated comments
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
}, {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
});

const Post = mongoose.model("Post", PostSchema);
export default Post;