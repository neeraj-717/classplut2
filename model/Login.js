import mongoose from "mongoose";

const LoginSchema = new mongoose.Schema({
  email: { type: String, required: true },
  username: { type: String},
  password: { type: String },
  otp: { type: String },
  role: { type: String, default: "user" },  
  createdAt: { type: Date },
});

const Login = mongoose.model("Login", LoginSchema);

export default Login;
