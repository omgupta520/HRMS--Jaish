const mongoose = require('mongoose');

/**
 * A generated payslip for one employee for one month/year. Earnings and
 * deductions are snapshotted so historical payslips never change if the
 * salary structure later changes.
 */
const payslipSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },

    workingDays: { type: Number, default: 0 },
    paidDays: { type: Number, default: 0 },
    lopDays: { type: Number, default: 0 }, // loss of pay days

    earnings: {
      basic: Number,
      hra: Number,
      allowances: Number,
      bonus: Number,
    },
    deductions: {
      pf: Number,
      esi: Number,
      tds: Number,
      lop: Number, // loss-of-pay amount
      other: Number,
    },
    grossEarnings: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },

    status: { type: String, enum: ['draft', 'processed', 'paid'], default: 'draft' },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

payslipSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Payslip', payslipSchema);
