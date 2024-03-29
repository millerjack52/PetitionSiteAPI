import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as Supporters from '../models/petition.supporter.model'
import {getIdByToken} from '../models/user.model'
import {getOne} from '../models/petitions.model'
import {alreadySupported, addNewSupporter} from '../models/petition.supporter.model'

const getAllSupportersForPetition = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const supporters = await Supporters.getAllSupportersForPetition(parseInt(id, 10));
        if (!supporters) {
            res.status(404).send('Not Found: No petition with id');
            return;
        }
        const transformedSupporters = supporters.map(supporter => ({
            supportId: supporter.id,
            supportTierId: supporter.support_tier_id,
            message: supporter.message,
            supporterId: supporter.user_id,
            supporterFirstName: supporter.first_name,
            supporterLastName: supporter.last_name,
            timestamp: supporter.timestamp.toISOString() // Convert timestamp to ISO string
        }));

        res.status(200).json(transformedSupporters.reverse());
    } catch (err) {
        Logger.error(err);
        res.status(500).send('Internal Server Error');
    }
};

const addSupporter = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { supportTierId, message } = req.body;
        if (isNaN(parseInt(id, 10)) || isNaN(parseInt(supportTierId, 10))) {
            res.status(400).json({ error: 'Bad Request. Invalid user ID' });
            return;
        }
        if (typeof supportTierId !== 'number' || !Number.isInteger(supportTierId)) {
            res.status(400).json({ error: 'Bad Request. Invalid support tier ID' });
            return;
        }
        if (!supportTierId) {
            res.status(400).send('Bad Request: Missing required fields');
            return;
        }
        const authToken = req.headers['x-authorization'];
        const userId = await getIdByToken(authToken);
        const petition = await getOne(parseInt(id, 10));
        if (!petition) {
            res.status(404).send('Not Found: No petition found with id');
            return;
        }
        if (petition.ownerId === userId) {
            res.status(403).send('Forbidden: Cannot support your own petition');
            return;
        }
        const checkAlreadySupported = await alreadySupported(userId, parseInt(id, 10), supportTierId);
        if (checkAlreadySupported) {
            res.status(403).send('Forbidden: Already supported at this tier');
            return;
        }
        if (!message) {
            await addNewSupporter(userId, parseInt(id, 10), supportTierId, null);
            res.status(201).send('Created');
            return;
        }
        await addNewSupporter(userId, parseInt(id, 10), supportTierId, message);
        res.status(201).send('Created');
        return;
    } catch (err) {
        Logger.error(err);
        res.status(500).send('Internal Server Error');
    }
};
export {getAllSupportersForPetition, addSupporter}