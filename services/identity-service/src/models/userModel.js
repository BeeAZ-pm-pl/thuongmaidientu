const customerModel = require('./customerModel');
const adminModel = require('./adminModel');
const { initDb } = require('./db');

module.exports = {
  initDb,
  customerModel,
  adminModel,
  // Helper bridge methods
  findByEmail: customerModel.findByEmail,
  findById: async (id) => {
    const cust = await customerModel.findById(id);
    if (cust) return cust;
    return await adminModel.findById(id);
  },
  create: customerModel.create,
  getAllUsers: customerModel.getAllCustomers,
  updateProfile: customerModel.updateProfile,
  updatePassword: customerModel.updatePassword
};
