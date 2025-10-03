import mongoose from "mongoose";

const batchcima = new mongoose.Schema({
    Batchname: { type: String },
    subject: { type: String },
     Users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Login' }],
    students: { type: Array }
});

const Batches = mongoose.model("batch", batchcima)

export default Batches