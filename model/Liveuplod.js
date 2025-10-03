import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
  title: { type: String, required: true },
  path: { type: String, required: true },
  Liveclass_Id: { type: String, required: true },
});

const Liveuplod = mongoose.model("liveclasses", classSchema);

export default Liveuplod;
