import asyncHandler from 'express-async-handler';
import truckService from '../services/truckService.js';
import { createCrudController } from '../utils/crudControllerFactory.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getTruckStatement } from '../services/statementService.js';

const controller = createCrudController(truckService, 'القلاب');

controller.statement = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const data = await getTruckStatement(req.params.id, { from, to });
  sendSuccess(res, { data });
});

export default controller;
