const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['public', 'optional', 'company'], default: 'public' },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

holidaySchema.index({ company: 1, date: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Holiday', holidaySchema);
