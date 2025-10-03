import mongoose from "mongoose";

const checkoutSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Login" },
    fname: String,
    lname: String,
    email: String,
    mobile: String,
    address: String,
    country: String,
    city: String,
    state: String,
    pincode: String,
    totalAmount: Number,
    courseId: String,
    courseName: String,
    paymentId: String,
    date: {
        type: String,
        default: () =>
            new Date().toLocaleString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
            }),
    },
});

const Checkout = mongoose.model("Checkout", checkoutSchema);
export default Checkout;
