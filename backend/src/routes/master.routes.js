/**
 * Mounts all master-data CRUD routers in one place.
 */
const express = require('express');
const buildMasterRouter = require('./masterRouter');

const Department = require('../models/Department');
const Designation = require('../models/Designation');
const Branch = require('../models/Branch');
const Shift = require('../models/Shift');
const Holiday = require('../models/Holiday');
const LeaveType = require('../models/LeaveType');

const router = express.Router();

router.use('/departments', buildMasterRouter(Department, {
  name: 'Department',
  searchFields: ['name'],
  populate: ['head'],
}));

router.use('/designations', buildMasterRouter(Designation, {
  name: 'Designation',
  searchFields: ['title'],
  populate: ['department'],
}));

router.use('/branches', buildMasterRouter(Branch, {
  name: 'Branch',
  searchFields: ['name', 'code'],
}));

router.use('/shifts', buildMasterRouter(Shift, {
  name: 'Shift',
  searchFields: ['name'],
}));

router.use('/holidays', buildMasterRouter(Holiday, {
  name: 'Holiday',
  searchFields: ['name'],
}));

router.use('/leave-types', buildMasterRouter(LeaveType, {
  name: 'LeaveType',
  searchFields: ['name', 'code'],
}));

module.exports = router;
