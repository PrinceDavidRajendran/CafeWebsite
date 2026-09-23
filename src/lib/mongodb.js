import mongoose from "mongoose";

function getUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Please define the MONGODB_URI environment variable");
  }
  return uri;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  // If we already have a live connection, reuse it. Guard against connections
  // that were ready once but have since disconnected.
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Start a fresh connect attempt only when there's no in-flight one, OR when
  // the previous attempt rejected (a transient DNS/network blip like
  // `querySrv ENOTFOUND` would otherwise poison the cache forever).
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(getUri(), {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      })
      .then((mongoose) => mongoose)
      .catch((err) => {
        // Clear the rejected promise so the next call can retry instead of
        // re-throwing the same failure forever.
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.conn = null;
    cached.promise = null;
    throw err;
  }
}

// If the live connection drops, let the next dbConnect() rebuild it.
mongoose.connection.on("disconnected", () => {
  cached.conn = null;
  cached.promise = null;
});

export default dbConnect;
