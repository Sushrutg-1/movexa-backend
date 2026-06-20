import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getChannelSubscribers,
  getUserSubscriptions,
  toggleSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();

router.use(verifyJWT);

// Subscribe / Unsubscribe a channel
router.route("/channel/:channelId").post(toggleSubscription);

// Get all subscribers of a channel
router.route("/channel/:channelId/subscribers").get(getChannelSubscribers);

// Get all channels a user has subscribed to
router.route("/user/:subscriberId/subscriptions").get(getUserSubscriptions);

export default router;
