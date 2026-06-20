import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import User from "../models/user.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import Subscription from "../models/subscription.model.js";

// Subscribe / Unsubscribe a channel
export const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid ChannelId");
  }

  if (channelId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot subscribed to yourself");
  }

  const channelExists = await User.exists({
    _id: channelId,
  });
  if (!channelExists) {
    throw new ApiError(404, "Channel not found");
  }

  const deletedSubscription = await Subscription.findOneAndDelete({
    subscriber: req.user._id,
    channel: channelId,
  });

  if (deletedSubscription) {
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Channel Unsubscribed Successfully"));
  }

  const subscription = await Subscription.create({
    subscriber: req.user._id,
    channel: channelId,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscription, "Channel Subscribed Successfully")
    );
});

// Get all subscribers of a channel
export const getChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid ChannelId");
  }

  const channelExists = await User.exists({
    _id: channelId,
  });
  if (!channelExists) {
    throw new ApiError(404, "Channel not found");
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
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
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
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
      $unwind: "$subscriber",
    },
    {
      $project: {
        _id: "$subscriber._id",
        fullName: "$subscriber.fullName",
        username: "$subscriber.username",
        avatar: "$subscriber.avatar",
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { subscribers, totalSubscribers: subscribers.length },
        "All subscribers fetched successfully"
      )
    );
});

// Get all channels a user has subscribed to
export const getUserSubscriptions = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!mongoose.isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid SubscriberId");
  }

  const subscriberExists = await User.exists({
    _id: subscriberId,
  });

  if (!subscriberExists) {
    throw new ApiError(404, "Subscriber not found");
  }

  const channels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
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
        localField: "channel",
        foreignField: "_id",
        as: "channel",
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
      $unwind: "$channel",
    },
    {
      $project: {
        _id: "$channel._id",
        fullName: "$channel.fullName",
        username: "$channel.username",
        avatar: "$channel.avatar",
        subscribedAt: "$createdAt",
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { channels, totalChannels: channels.length },
        "All Subscribed channel fetched successfully"
      )
    );
});
