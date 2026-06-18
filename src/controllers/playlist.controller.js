import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import Playlist from "../models/playlist.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import Video from "../models/video.model.js";
import User from "../models/user.model.js";

export const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name?.trim() || !description?.trim()) {
    throw new ApiError(400, "Name and Description is required");
  }

  const existingPlaylist = await Playlist.findOne({
    owner: req.user?._id,
    name: name?.trim(),
  });
  if (existingPlaylist) {
    throw new ApiError(400, "You already have a playlist with this name");
  }

  const playlist = await Playlist.create({
    name: name?.trim(),
    description: description?.trim(),
    owner: req.user?._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created successfully"));
});

export const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid PlaylistId");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
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
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",

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
        owner: {
          $first: "$owner",
        },
        totalVideos: {
          $size: "$videos",
        },
      },
    },
  ]);

  if (!playlist.length) {
    throw new ApiError(404, "Playlist not found");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        playlist: playlist[0],
      },
      "Playlist fetched successfully"
    )
  );
});

export const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid PlaylistId");
  }

  if (!name?.trim() && !description?.trim()) {
    throw new ApiError(400, "Atleast one field is required to update");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to update playlist details"
    );
  }

  const updateFields = {};

  if (name?.trim()) {
    updateFields.name = name.trim();
  }

  if (description?.trim()) {
    updateFields.description = description.trim();
  }

  try {
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $set: updateFields,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedPlaylist, "Playlist Updated Successfully")
      );
  } catch (error) {
    console.log(error.message);
    if (error.code === 11000) {
      throw new ApiError(400, "You already have a playlist with this name");
    }
    throw error;
  }
});

export const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid PlaylistId");
  }

  // const playlist = await Playlist.findById(playlistId);
  // if (!playlist) {
  //   throw new ApiError(404, "Playlist not found");
  // }

  // if (playlist.owner.toString() !== req.user._id.toString()) {
  //   throw new ApiError(403, "You are not authorized to delete this playlist");
  // }

  // const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

  const deletedPlaylist = await Playlist.findOneAndDelete({
    _id: playlistId,
    owner: req.user._id,
  });

  if (!deletedPlaylist) {
    throw new ApiError(404, "Playlist not found or you are not authorized");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

export const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid PlaylistId");
  }

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid VideoId");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to add video");
  }

  const videoAlreadyExist = playlist.videos.some(
    (id) => id.toString() === videoId
  );
  // const videoAlreadyExist = playlist.videos.includes(video._id);

  if (videoAlreadyExist) {
    throw new ApiError(400, "Video already in playlist");
  }

  playlist.videos.push(video._id);
  const updatedPlaylist = await playlist.save();

  // //if video already exist then error was ignore and return the playlist
  // const updatedPlaylist = await Playlist.findByIdAndUpdate(
  //   playlistId,
  //   {
  //     $addToSet: {
  //       videos: videoId,
  //     },
  //   },
  //   {
  //     new: true,
  //     runValidators: true,
  //   }
  // );

  // if (!updatedPlaylist) {
  //   throw new ApiError(404, "Playlist not found or you are not authorized");
  // }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video added to playlist successfully"
      )
    );
});

export const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid  VideoId");
  }

  if (!mongoose.isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid PlaylistId");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You are not authorized to remove video from playlist"
    );
  }

  const isVideoExistInPlaylist = playlist.videos.some(
    (id) => id.toString() === videoId
  );

  if (!isVideoExistInPlaylist) {
    throw new ApiError(404, "Video not found in playlist");
  }

  playlist.videos.pull(videoId);
  const updatedPlaylist = await playlist.save();

  //   const updatedPlaylist = await Playlist.findOneAndUpdate(
  //   {
  //     _id: playlistId,
  //     owner: req.user._id,
  //     videos: videoId,
  //   },
  //   {
  //     $pull: {
  //       videos: videoId,
  //     },
  //   },
  //   {
  //     new: true,
  //   }
  // );

  // if (!updatedPlaylist) {
  //   throw new ApiError(
  //     404,
  //     "Playlist not found, video not in playlist, or unauthorized"
  //   );
  // }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video removed from playlist successfully"
      )
    );
});

export const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid UserId");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const userPlaylists = await Playlist.find({ owner: userId }).sort({
    createdAt: -1,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { playlists: userPlaylists, totalPlaylists: userPlaylists.length },
        "user playlist fetched successfully"
      )
    );
});
