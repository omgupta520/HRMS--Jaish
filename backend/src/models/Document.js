const mongoose = require('mongoose');

/**
 * A file attached to an employee (offer letter, ID proof, payslip export, etc.).
 * Access is gated by RBAC + ownership in the controller layer.
 */
const documentSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
        'offer_letter',
        'appointment_letter',
        'experience_letter',
        'salary_slip',
        'id_proof',
        'address_proof',
        'other',
      ],
      default: 'other',
    },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true }, // relative path under /uploads
    mimeType: { type: String },
    size: { type: Number },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Document', documentSchema);
