import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeVideoFromPlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(createPlaylist);

router
  .route("/:playlistId")
  .get(getPlaylistById)
  .patch(updatePlaylist)
  .delete(deletePlaylist);

router.route("/user/:userId").get(getUserPlaylists);
router.route("/:playlistId/videos/:videoId").patch(addVideoToPlaylist);
router.route("/:playlistId/videos/:videoId").delete(removeVideoFromPlaylist);

export default router;
