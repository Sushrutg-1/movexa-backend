import mongoose from "mongoose";

const PlatlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    videos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
  },
  { timestamps: true }
);

PlatlistSchema.index(
  {
    owner: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

const Playlist = mongoose.model("Playlist", PlatlistSchema);

export default Playlist;
