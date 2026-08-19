import Customer from '../models/Customer.js';
import { createCrudService } from '../utils/crudFactory.js';

export default createCrudService(Customer, 'العميل');
