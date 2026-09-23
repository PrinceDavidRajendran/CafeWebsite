import mongoose from "mongoose";

export const ROLES = ["admin", "waiter"];

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9._-]+$/,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    role: {
      type: String,
      enum: ROLES,
      default: "waiter",
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
