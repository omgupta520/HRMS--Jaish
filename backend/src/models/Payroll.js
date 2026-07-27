const mongoose = require('mongoose');

/**
 * A monthly payroll run for a company. Groups the payslips generated in one
 * cycle and tracks aggregate totals + overall status.
 */
const payrollSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'processed', 'paid'], default: 'draft' },
    totalEmployees: { type: Number, default: 0 },
    totalGross: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    totalNet: { type: Number, default: 0 },
    payslips: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payslip' }],
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

payrollSchema.index({ company: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', payrollSchema);
