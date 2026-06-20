import { asyncHandler } from "../utils/asyncHandler.js";

export const healthcheck = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, { status: "OK" }, "Server is running successfully");
});
