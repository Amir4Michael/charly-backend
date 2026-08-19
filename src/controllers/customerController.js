import asyncHandler from 'express-async-handler';
import customerService from '../services/customerService.js';
import { createCrudController } from '../utils/crudControllerFactory.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getCustomerStatement } from '../services/statementService.js';

const controller = createCrudController(customerService, 'العميل');

controller.statement = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const data = await getCustomerStatement(req.params.id, { from, to });
  sendSuccess(res, { data });
});

export default controller;
