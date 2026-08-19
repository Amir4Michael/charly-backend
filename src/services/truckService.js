import Truck from '../models/Truck.js';
import { createCrudService } from '../utils/crudFactory.js';

export default createCrudService(Truck, 'القلاب');
