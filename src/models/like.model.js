import mongoose from "mongoose";

const LikeSchema = new mongoose.Schema(
  {
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    tweet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tweet",
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
    },
    likeBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

LikeSchema.index({
  likeBy: 1,
  video: 1,
});

LikeSchema.index({
  likeBy: 1,
  comment: 1,
});

LikeSchema.index({
  likeBy: 1,
  tweet: 1,
});

const Like = mongoose.model("Like", LikeSchema);

export default Like;
