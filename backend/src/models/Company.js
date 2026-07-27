const mongoose = require('mongoose');

/**
 * A tenant in the SaaS platform. All other domain data references a company,
 * which is the core of multi-tenancy isolation.
 */
const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    logo: { type: String }, // stored file path
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    // Per-company configuration consumed by attendance / leave / payroll modules.
    settings: {
      workingDays: { type: [Number], default: [1, 2, 3, 4, 5] }, // 0=Sun..6=Sat
      lateMarkAfter: { type: String, default: '09:30' }, // HH:mm
      halfDayHours: { type: Number, default: 4 },
      fullDayHours: { type: Number, default: 8 },
      currency: { type: String, default: 'INR' },
      payrollCycleDay: { type: Number, default: 1 },
    },
    isActive: { type: Boolean, default: true },
    employeeSequence: { type: Number, default: 0 }, // last used sequence for employee IDs
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
