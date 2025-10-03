
import mongoose from "mongoose";

const folderSchema = new mongoose.Schema({
  data: { type: String, required: true },
  documents: { type: Array, default: [] },
  id: { type: String, required: true },
  liveVideo: { type: Array, default: [] },
  videos: { type: Array, default: [] }
});

const courseSchema = new mongoose.Schema({
  Coursename: { type: String, required: true },
  Description: { type: String },
  imagePath: { type: String },
  Category: { type: String },
  CourseType: { type: String },
  Course_Category: { type: String },
  Course_Duration: { type: String },
  CruntPrice: { type: String },
  Discountrice: { type: String },
  Duration_Type: { type: String },
  Effectiveprice: { type: String },
  SubCategory: { type: String },
  anothercategory: { type: String },
  foldersdata: [folderSchema]   // array of folders
}, { timestamps: true });

const courses =  mongoose.model("Course", courseSchema);

export default courses


