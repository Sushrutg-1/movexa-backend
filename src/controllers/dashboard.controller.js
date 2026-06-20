import mongoose from "mongoose";
import Like from "../models/like.model.js";
import Subscription from "../models/subscription.model.js";
import Video from "../models/video.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = req.user._id;

  const totalVideos = await Video.countDocuments({
    owner: channelId,
  });

  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  const totalViews = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $group: {
        _id: null,
        totalViews: {
          $sum: "$views",
        },
      },
    },
  ]);

  const stats = {
    totalVideos,
    totalViews: totalViews[0]?.totalViews || 0,
    totalSubscribers,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, stats, "Channel stats fetched successfully"));
});

export const getChannelVideos = asyncHandler(async (req, res) => {
  const allVideos = await Video.find({
    owner: req.user._id,
  }).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { allVideos, totalVideos: allVideos.length },
        "All videos fetched successfully"
      )
    );
});
