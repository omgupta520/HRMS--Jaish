const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    address: {
      line1: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    phone: { type: String, trim: true },
    isHeadOffice: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

branchSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Branch', branchSchema);
