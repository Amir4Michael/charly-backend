import asyncHandler from 'express-async-handler';
import workerService from '../services/workerService.js';
import { createCrudController } from '../utils/crudControllerFactory.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { getWorkerStatement } from '../services/statementService.js';

const controller = createCrudController(workerService, 'العامل');

controller.statement = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const data = await getWorkerStatement(req.params.id, { from, to });
  sendSuccess(res, { data });
});

export default controller;
