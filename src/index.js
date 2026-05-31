import dotenv from "dotenv";
dotenv.config();
import connectDB from "./db/index.js";
import app from "./app.js";

const PORT = process.env.PORT || 7000;

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.error("ERROR : ", error);
    });

    app.listen(PORT, () => {
      console.log(`Server is listening on port :${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MONGO DB Connection Error : ", error);
  });
