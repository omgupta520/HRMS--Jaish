const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    title: { type: String, required: true, trim: true },
    level: { type: Number, default: 1 }, // seniority level, used for ordering
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

designationSchema.index({ company: 1, title: 1 }, { unique: true });

module.exports = mongoose.model('Designation', designationSchema);
