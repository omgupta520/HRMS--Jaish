const mongoose = require('mongoose');

/**
 * Leave application with a two-step approval flow:
 * pending -> manager_approved -> approved (HR) | rejected at any stage.
 */
const leaveSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true }, // working days requested
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'manager_approved', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    isPaid: { type: Boolean, default: true },

    managerAction: {
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      at: Date,
      comment: String,
    },
    hrAction: {
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      at: Date,
      comment: String,
    },
    // Tracks whether the leave balance has already been deducted, to avoid double-deduction.
    balanceDeducted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Leave', leaveSchema);
