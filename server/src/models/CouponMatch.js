const mongoose = require('mongoose');

const couponMatchSchema = new mongoose.Schema(
  {
    coupon_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      required: [true, 'coupon_id zorunludur'],
    },
    fixture_id: {
      type: String,
      required: [true, 'fixture_id zorunludur'],
    },
    home_team: {
      type: String,
      required: [true, 'home_team zorunludur'],
      maxlength: 150,
    },
    away_team: {
      type: String,
      required: [true, 'away_team zorunludur'],
      maxlength: 150,
    },
    league: {
      type: String,
      required: [true, 'league zorunludur'],
      maxlength: 150,
    },
    match_date: {
      type: Date,
      required: [true, 'match_date zorunludur'],
    },
    selected_bet: {
      type: String,
      required: [true, 'selected_bet zorunludur'],
      maxlength: 100,
    },
    odds: {
      type: Number,
      required: [true, 'odds zorunludur'],
    },
    confidence_score: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: false,
    collection: 'coupon_matches',
  }
);

couponMatchSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('CouponMatch', couponMatchSchema);
