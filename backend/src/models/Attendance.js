const mongoose = require('mongoose');

/**
 * One record per employee per calendar day. `date` is normalized to midnight UTC
 * so the unique index prevents duplicate attendance for the same day.
 */
const attendanceSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    date: { type: Date, required: true }, // normalized to 00:00:00
    checkIn: { type: Date },
    checkOut: { type: Date },
    status: {
      type: String,
      enum: ['present', 'absent', 'half_day', 'on_leave', 'wfh', 'holiday', 'weekoff'],
      default: 'present',
    },
    isLate: { type: Boolean, default: false },
    workedHours: { type: Number, default: 0 },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
    geo: {
      lat: Number,
      lng: Number,
    },
    note: { type: String, trim: true },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // set when HR marks manually

    // Regularization request workflow
    regularization: {
      requested: { type: Boolean, default: false },
      reason: String,
      status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
