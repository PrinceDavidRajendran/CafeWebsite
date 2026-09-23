import mongoose from "mongoose";

const TAG_PRIORITY = {
  Guest: 1,
  Pastor: 2,
  Elder: 3,
  Adult: 4,
  Youth: 5,
  Children: 6,
};

const OrderSchema = new mongoose.Schema({
  orderNumber: { type: Number, required: true },
  customerName: { type: String, required: true, trim: true },
  tag: {
    type: String,
    required: true,
    enum: ["Guest", "Pastor", "Elder", "Adult", "Youth", "Children"],
  },
  priority: { type: Number, required: true, min: 1, max: 6 },
  drink: { type: String, required: true },
  size: { type: String, required: true, enum: ["S", "M", "L"] },
  addOns: {
    type: [{ type: String, maxlength: 40 }],
    validate: {
      validator: (v) => !v || v.length <= 6,
      message: "addOns may contain at most 6 items",
    },
    default: [],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  waiterUsername: { type: String, required: true, trim: true },
  waiterName: { type: String, required: true, trim: true },
  status: {
    type: String,
    required: true,
    enum: ["pending", "served"],
    default: "pending",
  },
  // When the order was marked served (null while pending / after Undo).
  // Together with createdAt this gives per-drink fulfilment time for
  // future stats (e.g. average make time per drink/size).
  servedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

OrderSchema.pre("validate", function () {
  if (this.tag && !this.priority) {
    this.priority = TAG_PRIORITY[this.tag] || 6;
  }
});

OrderSchema.index({ status: 1, priority: 1, createdAt: 1 });
OrderSchema.index({ status: 1, servedAt: 1 });

export { TAG_PRIORITY };
export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
