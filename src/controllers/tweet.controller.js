import mongoose from "mongoose";
import Tweet from "../models/tweet.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../models/user.model.js";

export const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content?.trim()) {
    throw new ApiError(400, "Content is required");
  }

  const tweet = await Tweet.create({
    content: content.trim(),
    owner: req.user._id,
  });

  const createdTweet = await Tweet.findById(tweet._id).populate(
    "owner",
    "fullName username avatar"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, createdTweet, "Tweet created successfully"));
});

export const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid UserId");
  }

  const user = await User.exists({
    _id: userId,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },

    {
      $sort: {
        createdAt: -1,
      },
    },
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
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { tweets, totalTweets: tweets.length },
        "fetched user tweet successfully"
      )
    );
});

export const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content: newContent } = req.body;

  if (!mongoose.isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid TweetID");
  }

  if (!newContent?.trim()) {
    throw new ApiError(400, "Content is required");
  }

  const tweet = await Tweet.findOneAndUpdate(
    {
      _id: tweetId,
      owner: req.user._id,
    },
    {
      content: newContent.trim(),
    },
    {
      new: true,
    }
  );

  if (!tweet) {
    throw new ApiError(
      404,
      "Tweet not found or you are not authorized to update"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet update successfully"));
});

export const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!mongoose.isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid TweetId");
  }

  const deletedTweet = await Tweet.findOneAndDelete({
    _id: tweetId,
    owner: req.user._id,
  });

  if (!deletedTweet) {
    throw new ApiError(404, "tweet not found or you are not authorized");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});
