const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true }, // Casual, Sick, Earned...
    code: { type: String, trim: true, uppercase: true },
    annualQuota: { type: Number, default: 0 }, // days granted per year
    isPaid: { type: Boolean, default: true },
    carryForward: { type: Boolean, default: false },
    color: { type: String, default: '#6366f1' }, // for calendar display
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

leaveTypeSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('LeaveType', leaveTypeSchema);
