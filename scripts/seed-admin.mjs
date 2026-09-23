import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const {
  MONGODB_URI,
  ADMIN_SEED_USERNAME,
  ADMIN_SEED_PASSWORD,
  ADMIN_SEED_NAME,
} = process.env;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}
if (!ADMIN_SEED_USERNAME || !ADMIN_SEED_PASSWORD) {
  console.error("Missing ADMIN_SEED_USERNAME or ADMIN_SEED_PASSWORD");
  process.exit(1);
}

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "waiter"], default: "waiter" },
    passwordHash: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

try {
  await mongoose.connect(MONGODB_URI);
  const existing = await User.findOne({ role: "admin" });
  if (existing) {
    console.log(`exists: admin "${existing.username}" already present`);
  } else {
    const passwordHash = await bcrypt.hash(ADMIN_SEED_PASSWORD, 12);
    await User.create({
      username: ADMIN_SEED_USERNAME,
      name: ADMIN_SEED_NAME || ADMIN_SEED_USERNAME,
      role: "admin",
      passwordHash,
      active: true,
    });
    console.log(`created: admin "${ADMIN_SEED_USERNAME}"`);
  }
} catch (err) {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
