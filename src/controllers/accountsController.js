import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../utils/apiResponse.js';
import { getAccountsOverview } from '../services/accountsService.js';

export const getOverview = asyncHandler(async (req, res) => {
  const data = await getAccountsOverview();
  sendSuccess(res, { data });
});
