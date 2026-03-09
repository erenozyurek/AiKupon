const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'user_id zorunludur'],
    },
    name: {
      type: String,
      required: [true, 'Kupon adı zorunludur'],
      minlength: 1,
      maxlength: 255,
    },
    status: {
      type: String,
      enum: ['draft', 'analyzed', 'saved'],
      default: 'draft',
      required: true,
    },
    total_odds: {
      type: Number,
      default: null,
    },
    detailed_analysis: {
      type: String,
      default: null,
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
    collection: 'coupons',
  }
);

couponSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('Coupon', couponSchema);
