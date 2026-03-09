const mongoose = require('mongoose');

const analysisResultSchema = new mongoose.Schema(
  {
    coupon_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      required: [true, 'coupon_id zorunludur'],
    },
    risk_type: {
      type: String,
      enum: ['low', 'balanced', 'high'],
      required: [true, 'risk_type zorunludur'],
    },
    ai_response: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'ai_response zorunludur'],
    },
    created_at: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
    collection: 'analysis_results',
    strict: false,
  }
);

// Bir kupon için aynı risk_type'da tek analiz olabilir
analysisResultSchema.index({ coupon_id: 1, risk_type: 1 }, { unique: true });

analysisResultSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('AnalysisResult', analysisResultSchema);
