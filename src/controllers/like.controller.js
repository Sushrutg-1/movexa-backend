import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import Video from "../models/video.model.js";
import Like from "../models/like.model.js";
import Comment from "../models/comment.model.js";
import Tweet from "../models/tweet.model.js";

export const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  const video = await Video.exists({ _id: videoId });
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const like = await Like.findOne({
    video: videoId,
    likeBy: req.user._id,
  });

  if (!like) {
    const newLike = await Like.create({
      video: videoId,
      likeBy: req.user._id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { newLike, isLiked: true },
          "Video liked successfully"
        )
      );
  }

  await like.deleteOne();
  return res
    .status(200)
    .json(
      new ApiResponse(200, { isLiked: false }, "Video unliked successfully")
    );
});

export const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid CommentId");
  }

  const comment = await Comment.exists({ _id: commentId });
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const like = await Like.findOne({
    comment: commentId,
    likeBy: req.user._id,
  });

  if (!like) {
    const newLike = await Like.create({
      comment: commentId,
      likeBy: req.user._id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { newLike, isLiked: true },
          "Comment liked successfully"
        )
      );
  }

  await like.deleteOne();
  return res
    .status(200)
    .json(
      new ApiResponse(200, { isLiked: false }, "Comment unliked successfully")
    );
});

export const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!mongoose.isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid TweetId");
  }

  const tweet = await Tweet.exists({ _id: tweetId });
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  const like = await Like.findOne({
    tweet: tweetId,
    likeBy: req.user._id,
  });

  if (!like) {
    const newLike = await Like.create({
      tweet: tweetId,
      likeBy: req.user._id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { newLike, isLiked: true },
          "Tweet liked successfully"
        )
      );
  }

  await like.deleteOne();
  return res
    .status(200)
    .json(
      new ApiResponse(200, { isLiked: false }, "Tweet unliked successfully")
    );
});

export const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likeBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $exists: true },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
    {
      $addFields: {
        video: {
          $first: "$video",
        },
      },
    },
    {
      $replaceRoot: {
        newRoot: "$video",
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { likedVideos, totalLikedVideos: likedVideos.length },
        "fetched liked videos successfully"
      )
    );
});
