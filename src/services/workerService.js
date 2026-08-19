import Worker from '../models/Worker.js';
import { createCrudService } from '../utils/crudFactory.js';

export default createCrudService(Worker, 'العامل');
