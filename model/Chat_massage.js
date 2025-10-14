import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "user",
    },
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true } 
);

const message = mongoose.model("message", messageSchema)

export default message


