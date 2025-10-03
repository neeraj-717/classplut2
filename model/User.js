import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  contactNo: String,
  registrdata: String,
  courseId: Array,
  courseName: Array,
  BatchId: Array,
  BatchName: Array,
});

export default mongoose.model("User", userSchema);
