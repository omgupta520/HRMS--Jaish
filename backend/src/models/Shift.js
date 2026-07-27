const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true }, // e.g. "General", "Night"
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true }, // HH:mm
    graceMinutes: { type: Number, default: 15 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

shiftSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Shift', shiftSchema);
