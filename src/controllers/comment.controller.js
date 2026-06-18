import mongoose, { mongo } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import Video from "../models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import Comment from "../models/comment.model.js";

export const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const matchingCondition = {
    video: new mongoose.Types.ObjectId(videoId),
  };

  const aggregate = Comment.aggregate([
    {
      $match: matchingCondition,
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
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  const options = {
    page: Number(page),
    limit: Number(limit),
  };

  const allComments = await Comment.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .json(
      new ApiResponse(200, allComments, "all comments fetched successfully")
    );
});

export const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Content is required");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const comment = await Comment.create({
    content: content?.trim(),
    video: videoId,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "comment added successfully"));
});

export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid Comment ID");
  }

  const comment = await Comment.findById(commentId).populate("video", "owner");
  if (!comment) {
    throw new ApiError(404, "Comment not found ");
  }

  const isCommentOwner = comment.owner.toString() === req.user._id.toString();
  const isVideoOwner =
    comment.video?.owner?.toString() === req.user._id.toString();

  if (!isCommentOwner && !isVideoOwner) {
    throw new ApiError(403, "you are not authorized to delete comment");
  }
  await comment.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted Successfully"));
});

export const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content: newContent } = req.body;

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid Comment Id");
  }

  if (!newContent?.trim()) {
    throw new ApiError(400, "Content is required");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update comment");
  }

  comment.content = newContent?.trim();

  const updatedComment = await comment.save();

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});
