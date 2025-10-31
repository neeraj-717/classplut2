import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import Videos from "./model/Videos.js";
import path from "path";
import { fileURLToPath } from "url";
import Login from "./model/Login.js";
import jwt from "jsonwebtoken";
import Liveuplod from "./model/Liveuplod.js";
import User from "./model/User.js";
import Batches from "./model/Batches.js";
import courses from "./model/Courses.js";
import nodemailer from "nodemailer";
import * as crypto from "crypto";
import tokenVerify from "./middleware/tokenvarify.js";
import dotenv from "dotenv";
import Checkout from "./model/Checkout.js";
import { start } from "repl";
import message from "./model/Chat_massage.js";
import Brevo from 'sib-api-v3-sdk';
import axios from "axios";
dotenv.config();

const port = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET;
// const mongoURI = process.env.MONGODB_URI;  

// ========== MongoDB Connection ==========


mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log(" Connected to MongoDB"))
.catch((err) => console.error(" DB connection error:", err));

// ========== App + Server + Socket Setup ==========
const app = express();
const server = createServer(app);

const allowedOrigins = [
  "https://classplusfrontend.vercel.app", // your frontend
  "http://localhost:3000"                 // for local dev (optional)
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// Or allow all temporarily (not recommended for prod)
// app.use(cors());

app.use(express.json());

const io = new Server(server, { cors: { origin: "*" } });

let adminSocket = null;
let viewers =[];
io.on("connection", (socket) => {
  // console.log("Connected:", socket.id);

  socket.on("role", (role) => {
    if (role === "admin") {
      adminSocket = socket.id;
      console.log("Admin connected:", socket.id);
    } else {
      if (adminSocket) io.to(adminSocket).emit("new-viewer", socket.id);
      console.log("User connected:", socket.id);
    }
    
  });

  
  socket.on("live-start", (Liveclass_Id) => {
    
    socket.broadcast.emit("notify-live", {
      Liveclass_Id,
      message: "Admin started a live class! Click to join ",
    });
    
    console.log(" Live stream started, notifying users...");
  });
  

  socket.on("chatMessage", async (msg) => {
    try {
      
      const newMsg = new message(msg);
      await newMsg.save();
      console.log("Message saved:", msg.text);

      // Broadcast to everyone
      io.emit("chatMessage", msg);
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });


  socket.on("join-live", (user) => {
    // Add to viewers list
    const userData = { socketId: socket.id, ...user };
    

    if (adminSocket) {
      io.to(adminSocket).emit("viewer-joined", userData);
    }

    // (Optional) confirm back to user
    socket.emit("joined-confirmation", {
      message: `Welcome ${user.name}, you joined LiveClass ${user.courseId}`,
    });
  });
  
  

  socket.on("offer", ({ offer, to }) => {
    io.to(to).emit("offer", { offer, from: socket.id });
  });
  
  socket.on("answer", ({ answer, to }) => {
    
    io.to(to).emit("answer", { answer, from: socket.id });
  });
  
  socket.on("ice-candidate", ({ candidate, to }) => {
    
    io.to(to).emit("ice-candidate", { candidate, from: socket.id });
  });
  
  socket.on("disconnect", () => {
    if (socket.id === adminSocket) adminSocket = null;
  });
});

// livechates

app.get("/messages", async (req, res) => {
  const msgs = await message.find().sort({ _id: 1 });
  res.json(msgs);
});


app.post("/go",(res,req)=>{
  console.log("object")
})
// ========== Static File Serving ==========
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/images", express.static("images"));
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, path) => {
      res.set("Cache-Control", "no-store");
      res.set("Accept-Ranges", "bytes");
    },
  })
);
app.use("/Liveuplodes", express.static(path.join(__dirname, "Liveuplodes")));

// ==========================
// Multer setup for regular videos
// ==========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

app.post("/videos", upload.single("video"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ status: false, msg: "No video uploaded" });

    const filePath = req.file.path.replace(/\\/g, "/");

    const newVideo = new Videos({
      title: req.body.title || req.file.originalname,
      path: filePath,
      CourseId: req.body.courseId,
      Publish: req.body.Publish,
    });

    await newVideo.save();
    res.status(201).json({
      status: true,
      msg: "Video uploaded & saved!",
      data: newVideo,
    });
  } catch (error) {
    res.status(500).json({ status: false, msg: error.message });
  }
});

app.get("/getvideos", async (req, res) => {
  try {
    const videos = await Videos.find();
    res.json({ status: true, data: videos });
  } catch (error) {
    res.json({ status: false, msg: error.message });
  }
});

app.post("/deletevideo", async (req, res) => {
  const { id } = req.body;
  await Videos.findByIdAndDelete(id);
  res.json({ status: true });
});

app.post("/updatevideotitle", async (req, res) => {
  const { id, title } = req.body;
  await Videos.findByIdAndUpdate(id, { title });
  res.json({ status: true });
});

app.post("/updatevideopublish", async (req, res) => {
  const { id, publish } = req.body;
  await Videos.findByIdAndUpdate(id, { Publish: publish });
  res.json({ status: true });
});

// ==========================
// Multer setup for live class uploads
// ==========================
const Liveclassstorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "Liveuplodes/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const liveupload = multer({ storage: Liveclassstorage });

app.post("/liveclasssvideos", liveupload.single("video"), async (req, res) => {
  try {
    if (!req.file)
      return res.json({ status: false, msg: "No video uploaded" });

    const newclass = new Liveuplod({
      title: req.file.originalname,
      path: req.file.path.replace(/\\/g, "/"),
      Liveclass_Id: req.body.Liveclass_Id,
    });

    await newclass.save();
    res.json({
      status: true,
      msg: "Live class video uploaded & saved!",
      data: newclass,
    });
  } catch (error) {
    res.json({ status: false, msg: error.message });
  }
});

app.get("/getlivevideos", async (req, res) => {
  let data = await Liveuplod.find({});
  res.json({ status: true, vdata: data });
});

// ========== Start Server ==========





// Courses  -------------===============------------------====================------------
const imagestorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "images/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});

const uploadimage = multer({ storage: imagestorage });
app.post("/course", uploadimage.single("image"), async (req, res) => {

  try {
    // console.log("Image File:", req.file);   // multer handles this
    // console.log("Form Fields:", req.body);  // all fields are here
    const parsedFolders = JSON.parse(req.body.foldersdata);
    const {
      Coursename,
      Description,
      Category,
      SubCategory,
      anothercategory,
      CourseType,
      Course_Category,
      Course_Duraction,
      Duraction_Type,
      CruntPrice,
      Dicsountprice,
      Effectiveprice,
      foldersdata
    } = req.body;



    const newCourse = new courses({
      Coursename,
      Description,
      Category,
      SubCategory,
      anothercategory,
      CourseType,
      Course_Category,
      Course_Duration: Course_Duraction,
      Duration_Type: Duraction_Type,
      CruntPrice,
      Discountrice: Dicsountprice,
      Effectiveprice,
      foldersdata: parsedFolders,
      imagePath: req.file?.path // optional: store image path in DB
    });

    await newCourse.save();

    res.status(201).json({ message: "Course saved successfully!", course: newCourse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong!" });
  }
});



app.get("/getcourses", async (req, res) => {
  const course = await courses.find({});

  res.json({
    status: 201,
    coursedata: course
  })
})


app.post("/courseimage", (req, res) => {
  console.log(req.file)
})

app.post("/deletecourse", async (req, res) => {
  const { id } = req.body;
  await courses.findByIdAndDelete(id);
  res.json({ status: true, msg: "Course deleted" })

});

app.put("/updatecourse", uploadimage.single("image"), async (req, res) => {
  try {
    const { _id } = req.body;

    if (!_id) {
      return res.status(400).json({ status: false, msg: "Course ID is required." });
    }

    // Safely parse foldersdata
    let parsedFolders = [];
    try {
      parsedFolders = JSON.parse(req.body.foldersdata || '[]');
    } catch (e) {
      console.error("Invalid foldersdata:", e.message);
      return res.status(400).json({ status: false, msg: "Invalid foldersdata format." });
    }

    const updateData = {
      Coursename: req.body.Coursename,
      Description: req.body.Description,
      Category: req.body.Category,
      SubCategory: req.body.SubCategory,
      anothercategory: req.body.anothercategory,
      CourseType: req.body.CourseType,
      Course_Category: req.body.Course_Category,
      Course_Duration: req.body.Course_Duration,
      Duration_Type: req.body.Duration_Type,
      CruntPrice: req.body.CruntPrice,
      Discountrice: req.body.Discountrice,
      Effectiveprice: req.body.Effectiveprice,
      foldersdata: parsedFolders
    };

    // Only update imagePath if a new image is uploaded
    if (req.file?.path) {
      updateData.imagePath = req.file.path;
    }

    await courses.findByIdAndUpdate(_id, updateData);

    res.json({ status: true, msg: "Course updated successfully" });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ status: false, msg: "Error updating course" });
  }
});

// Batches---------------------------====================------------------

app.post("/batch", async (req, res) => {

  console.log(req.body)

  let addbatch = new Batches({
    Batchname: req.body.Batchname,
    subject: req.body.subject,
    students: req.body.students
  })

  res.json({
    status: true,
    msg: "Submited"
  })

  await addbatch.save()

})


app.get("/getbatch", async (req, res) => {
  let batches = await Batches.find({})

  res.json({
    status: true,
    batch: batches
  })
})

app.get("/userBatches", tokenVerify, async (req, res) => {
  let userbatch = await Batches.find({ Users: req.user.id })

  res.json({
    status: true,
    batch: userbatch
  })
})

// app.get("/latestcourse", async (req, res) => {
//   try {
//     const latest = await Batches.findOne().sort({ createdAt: -1 });
//     res.json({ Batches: latest });
//     console.log(latest._id, "lattest")
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });


// Users---------------------------------=================----------------------======================--

// app.post("/users", async (req, res) => {

//   console.log(req.body)

//   let userdata = new User({
//     name: req.body.name,
//     contactNo: req.body.contactNo,
//     registrdata: req.body.registrdata
//   })

//   await userdata.save()

//   res.json({
//     status: true,
//     mgg: "data posted"
//   })
// })

app.post("/deletebatch",async(req,res)=>{
  // console.log(req.body)
  if (!req.body.batchid) {
      return res.status(400).json({ status: false, msg: "Batch ID is required." });
    }
  await Batches.findByIdAndDelete(req.body.batchid)
  res.json({
    status:true,
    msg:"Delete success"
  })
})

app.post("/Edit_Batch", async (req, res) => {
  let { _id, Batchname, subject, Users } = req.body.formData;

if (!_id) {
      return res.status(400).json({ status: false, msg: "Batch ID is required." });
    }
  let updatedata = {
    Batchname: Batchname,
    subject: subject,
    Users: Users,
  };
  // console.log(updatedata)
  await Batches.findByIdAndUpdate(_id, updatedata);

  res.json({
    status: true,
    msg: "updated"
  });
});


app.post("/Updatebatchid", async (req, res) => {
  try {
    const { userIds, courseId } = req.body;
    console.log(courseId, "hhjh");

    if (!Array.isArray(userIds) || !courseId) {
      return res.status(400).json({ message: "userIds[] aur courseId required hai" });
    }

    // Get course details from Batches
    const course = await Batches.findById(courseId);
    console.log(course)
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const objectIds = userIds.map(id => new mongoose.Types.ObjectId(id));

    // Update users: add batch info (using $set or $push depending on schema)
    const result = await Login.updateMany(
      { _id: { $in: objectIds } },
      { $push: { BatchId: courseId, BatchName: course.Batchname } }
    );

    // Now update the batch to add user IDs (avoid duplicates using $addToSet)
    const batchUpdateResult = await Batches.findByIdAndUpdate(
      courseId,
      { $addToSet: { Users: { $each: objectIds } } },
      { new: true }
    );

    // Fetch updated users (optional)
    const updatedUsers = await Login.find({ _id: { $in: objectIds } });

    res.json({
      status: true,
      message: "Course ID + Course Name users me add ho gaye ",
      result,
      batchUpdateResult,
      updatedUsers
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: err.message });
  }
});


app.post("/Addcourseinuser", async (req, res) => {
  try {
    const { userIds, courseId } = req.body;

    if (!Array.isArray(userIds) || !courseId) {
      return res.status(400).json({ message: "userIds[] aur courseId required hai" });
    }

    // Get course details from Batches
    const course = await courses.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const objectIds = userIds.map(id => new mongoose.Types.ObjectId(id));

    // Update users
    const result = await User.updateMany(
      { _id: { $in: objectIds } },
      { $push: { courseId: courseId, courseName: course.Coursename } }
    );

    // Fetch updated users
    const updatedUsers = await User.find({ _id: { $in: objectIds } });

    res.json({
      status: true,
      message: "Course ID + Course Name users me add ho gaye ",
      result,
      updatedUsers
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: err.message });
  }
});


// request-otp login with oto ==============----------------==================------------

// app.post("/request-otp", async (req, res) => {
//   const { email, username, role, password } = req.body;
//   console.log(req.body,"login")
//   if (!email || !username || !password) {
//     return res.status(400).json({ status: false, msg: "Email, Username, and Password are required" });
//   }

//   const otp = Math.floor(100000 + Math.random() * 900000).toString();

//   let transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: "jakhar365365@gmail.com",
//       pass: "uvdz tbyt oxch qmkf" // ❗ Use environment variable in production
//     }
//   });

//   const mailOptions = {
//     from: "jakhar365365@gmail.com",
//     to: email,
//     subject: "Your OTP Code",
//     text: `Your OTP code is ${otp}`,
//   };

//   try {
//     await transporter.sendMail(mailOptions);

//     const existingLogin = await Login.findOne({ email });

//     if (existingLogin) {
//       // Check if username and password match
//       if (

//         existingLogin.password !== password
//       ) {
//         return res.status(400).json({
//           status: false,
//           msg: "User already exists with different username or password",
//         });
//       }


//       existingLogin.otp = otp;
//       existingLogin.role = role || existingLogin.role;

//       await existingLogin.save();
//     } else {
//       // New user
//       const logindata = new Login({
//         email,
//         otp,
//         password,
//         username,
//         role: role || "user",
//         createdAt: new Date(),
//       });
//       await logindata.save();
//     }

//     res.status(200).json({ msg: "OTP sent successfully" });


//   } catch (error) {
//     res.status(500).json({ status: false, msg: "Failed to send OTP", error: error.message });
//   }
// });

app.post("/request-otp", async (req, res) => {
  try {
    const { email, username, role, password } = req.body;
    console.log("Request body:", req.body);

    if (!email || !username || !password) {
      return res.status(400).json({
        status: false,
        msg: "Email, Username, and Password are required",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    if (!process.env.BREVO_API_KEY || !process.env.EMAIL_FROM) {
      return res.status(500).json({ msg: "Brevo not configured properly" });
    }

    // ✅ Email Payload
    const payload = {
      sender: { name: "One Roof Education", email: process.env.EMAIL_FROM },
      to: [{ email }],
      subject: "Your OTP Code",
      htmlContent: `<h2>Your OTP is: <b>${otp}</b></h2><p>Expires in 10 minutes.</p>`,
    };

    // ✅ Send Email using Brevo API via axios
    await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    console.log(`OTP email sent to: ${email}`);

    // ✅ DB save / update
    const existingLogin = await Login.findOne({ email });

    if (existingLogin) {
      if (existingLogin.password !== password) {
        return res.status(400).json({
          status: false,
          msg: "User already exists with a different password",
        });
      }

      existingLogin.otp = otp;
      existingLogin.role = role || existingLogin.role;
      existingLogin.expiresAt = expiresAt;
      await existingLogin.save();
    } else {
      await Login.create({
        email,
        username,
        password,
        otp,
        role: role || "user",
        expiresAt,
        createdAt: new Date(),
      });
    }

    return res.status(200).json({
      status: true,
      msg: "OTP sent successfully via Brevo",
    });

  } catch (error) {
    console.error("OTP send error:", error);
    return res.status(500).json({
      status: false,
      msg: "Failed to send OTP",
      error: error.message,
    });
  }
});

// app.post("/reset-password", async (req, res) => {
  
//   const { email, otp, newUsername, newPassword } = req.body;

//   // Check if required fields are provided
//   if (!email || !otp || !newUsername || !newPassword) {
//     return res.status(400).json({
//       status: false,
//       msg: "Email, OTP, new username, and new password are required",
//     });
//   }

//   try {
//     const user = await Login.findOne({ email });

//     if (!user) {
//       return res.status(404).json({
//         status: false,
//         msg: "User not found",
//       });
//     }

//     // Optional: Check if OTP is expired (e.g., valid for 10 mins)
//     const OTP_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes
//     const now = new Date();
//     if (now - new Date(user.createdAt) > OTP_EXPIRY_TIME) {
//       return res.status(400).json({
//         status: false,
//         msg: "OTP has expired. Please request a new one.",
//       });
//     }

//     // Check if OTP matches
//     if (user.otp !== otp) {
//       return res.status(400).json({
//         status: false,
//         msg: "Invalid OTP",
//       });
//     }

//     // Optional: Check if new username already exists in another account
//     const usernameExists = await Login.findOne({ username: newUsername });
//     if (usernameExists && usernameExists.email !== email) {
//       return res.status(400).json({
//         status: false,
//         msg: "Username is already taken",
//       });
//     }

//     // Update username and password
//     user.username = newUsername;
//     user.password = newPassword; // Hash in production
//     user.otp = null; // Clear OTP
//     user.createdAt = new Date(); // Update time

//     await user.save();

//     res.json({
//       status: true,
//       msg: "Password and username updated successfully",
//     });

//   } catch (error) {
//     res.status(500).json({
//       status: false,
//       msg: "Failed to reset password",
//       error: error.message,
//     });
//   }
// });


// "/verify-otp"----------------------------------------------------


app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  console.log(req.body,"reqotp")
  if (!email || !otp) {
    return res.status(400).json({ status: false, msg: "Email and OTP are required" });
  }

  const user = await Login.findOne({ email, otp });
  // console.log(user)
  if (!user) {
    return res.status(401).json({ status: false, msg: "Invalid OTP" });
  }

  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },  // include role in token
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.json({
    status: true,
    msg: "OTP verified. Login successful.",
    token,
    role: user.role,
    email: user.email,
    user_id: user._id
  });
});

// app.get("/getuserrole", async (req, res) => {
//   let usersdata = await Login.find({});
//   res.json({ status: true, data: usersdata });
// });

app.post("/checkout", tokenVerify, async (req, res) => {
  console.log(req.body)

  let checkout = new Checkout({
    fname: req.body.fname,
    lname: req.body.lname,
    email: req.body.email,
    mobile: req.body.mobile,
    address: req.body.address,
    country: req.body.country,
    city: req.body.city,
    state: req.body.state,
    pincode: req.body.pincode,
    totalAmount: req.body.totalAmount,
    courseId: req.body.courseId,
    courseName: req.body.courseName,
    paymentId: req.body.paymentId,
    user: req.user.id
  });

  try {
    await checkout.save();
    console.log(checkout)
    res.json({ status: true, message: "Checkout successful", data: checkout });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Checkout failed", error: error.message });
  }
});

app.get("/getusers", async (req, res) => {
  const users = await Login.find();
  res.json({ status: true, data: users });
});

app.get("/profile", tokenVerify, async (req, res) => {
  try {
    const user = await Login.findById(req.user.id).select('-otp  -password');
    if (!user) {
      return res.status(404).json({ status: false, msg: "User not found" });
    }
    res.json({ status: true, data: user });
  } catch (error) {
    res.status(500).json({ status: false, msg: error.message });
  }
});

app.get("/allchatusers", async (req, res) => {
  try {
    const users = await Checkout.find({});
    res.json({ status: true, data: users });
  } catch (error) {
    res.status(500).json({ status: false, msg: error.message });
  }
});

app.get("/checkoutget", tokenVerify, async (req, res) => {
  try {
    const checkouts = await Checkout.find({ user: req.user.id });
    console.log(checkouts);
    res.json({ status: true, data: checkouts });
  } catch (error) {
    res.status(500).json({ status: false, msg: error.message });
  }
});

app.get("/",(req,res)=>{
  res.json({
    msg:"run "
  })
})

// Start server
server.listen(port, () => {
  console.log("Server running on http://localhost:5000");
});
