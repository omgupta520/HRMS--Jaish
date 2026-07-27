const mongoose = require('mongoose');

/**
 * Full HR profile for a person. Linked 1:1 to a User (for auth). Holds personal,
 * job, salary structure, bank and emergency details plus reporting hierarchy.
 */
const employeeSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String, required: true }, // e.g. ACME-00001

    // Personal details
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    dateOfBirth: { type: Date },
    address: { type: String, trim: true },
    avatar: { type: String },

    // Job details
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    designation: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
    reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    joiningDate: { type: Date, required: true, default: Date.now },
    employmentType: {
      type: String,
      enum: ['full_time', 'part_time', 'intern', 'contract'],
      default: 'full_time',
    },
    status: {
      type: String,
      enum: ['active', 'resigned', 'terminated', 'on_notice'],
      default: 'active',
    },

    // Salary structure (monthly amounts). Net = earnings - deductions.
    salary: {
      basic: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      allowances: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      pf: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      tds: { type: Number, default: 0 },
      otherDeductions: { type: Number, default: 0 },
    },

    // Bank + statutory
    bank: {
      accountName: String,
      accountNumber: String,
      bankName: String,
      ifsc: String,
    },
    pan: { type: String, trim: true },

    emergencyContact: {
      name: String,
      relation: String,
      phone: String,
    },

    leaveBalances: [
      {
        leaveType: { type: mongoose.Schema.Types.ObjectId, ref: 'LeaveType' },
        balance: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

employeeSchema.index({ company: 1, employeeId: 1 }, { unique: true });
employeeSchema.index({ company: 1, reportingManager: 1 });

employeeSchema.virtual('fullName').get(function fullName() {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
});

employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Employee', employeeSchema);
