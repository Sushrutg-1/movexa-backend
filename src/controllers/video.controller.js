import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import Video from "../models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import uploadToCloud from "../utils/cloudinary.js";
import Playlist from "../models/playlist.model.js";

export const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const matchCondition = {
    isPublished: true,
  };

  if (query) {
    matchCondition.$or = [
      {
        title: {
          $regex: query,
          $options: "i",
        },
      },
      {
        description: {
          $regex: query,
          $options: "i",
        },
      },
    ];
  }

  if (userId) {
    if (!mongoose.isValidObjectId(userId)) {
      throw new ApiError(404, "invalid userId");
    }

    matchCondition.owner = new mongoose.Types.ObjectId(userId);
  }

  const aggregate = Video.aggregate([
    {
      $match: matchCondition,
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
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
  ]);

  const options = {
    page: Number(page),
    limit: Number(limit),
  };

  const videos = await Video.aggregatePaginate(aggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "videos fetched successfully"));
});

export const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title and Description is required");
  }

  const existingTitle = await Video.findOne({ title: title });
  if (existingTitle) {
    throw new ApiError(409, "Title already used");
  }

  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video File is required");
  }

  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const videoFile = await uploadToCloud(videoFileLocalPath);
  if (!videoFile) {
    throw new ApiError(400, "Video upload failed");
  }

  const thumbnail = await uploadToCloud(thumbnailLocalPath);
  if (!thumbnail) {
    throw new ApiError(400, "Thumbnail upload failed");
  }

  const video = await Video.create({
    title: title.trim(),
    description: description?.trim(),
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video Published Successfully"));
});

export const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "invalid video ID");
  }

  const video = await Video.findById(videoId).populate(
    "owner",
    "username fullName avatar"
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "video fetched successfully"));
});

export const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "invalid videoId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this video");
  }

  await Playlist.updateMany(
    {
      videos: video._id,
    },
    {
      $pull: {
        videos: video._id,
      },
    }
  );
  await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

export const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update video details");
  }

  const newThumbnailLocalPath = req.file?.path;
  if (newThumbnailLocalPath) {
    const newThumbnail = await uploadToCloud(newThumbnailLocalPath);
    if (!newThumbnail) {
      throw new ApiError(500, "Failed to upload thumbnail");
    }
    video.thumbnail = newThumbnail.url;
  }

  if (title?.trim()) {
    video.title = title.trim();
  }

  if (description?.trim()) {
    video.description = description.trim();
  }

  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, video, "video updated successfully"));
});

export const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "invalid videoId");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to update video publish Status"
    );
  }

  video.isPublished = !video.isPublished;
  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video Publish Status Updated"));
});
