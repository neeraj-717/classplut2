import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  path: { type: String, required: true },
  CourseId: { type: String },
  Publish: { type: Boolean },
});

const Videos = mongoose.model("Videos", videoSchema);

export default Videos;
