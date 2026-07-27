const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    audience: { type: String, enum: ['company', 'department'], default: 'company' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    priority: { type: String, enum: ['normal', 'important', 'urgent'], default: 'normal' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Users who have read the announcement (drives the notification badge).
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

announcementSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
