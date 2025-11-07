import express from 'express';
import {
    listAgendas,
    getAgendaDetail,
    createAgenda,
    updateAgenda,
    deleteAgenda
} from '../controllers/agendaController.js';
import { authenticateToken } from '~/middlewares/authMiddleware';

const router = express.Router();

router.get('/',authenticateToken,listAgendas);
router.get('/:agendaId',authenticateToken, getAgendaDetail);
router.post('/',authenticateToken, createAgenda);
router.patch('/:agendaId',authenticateToken, updateAgenda);
router.delete('/:agendaId',authenticateToken, deleteAgenda);

