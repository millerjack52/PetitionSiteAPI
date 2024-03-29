import {Request, Response} from "express";
import Logger from "../../config/logger";
import * as SupportTiers from '../models/petitions.support_tier.model';
import * as Petition from '../models/petitions.model';
import {getIdByToken} from '../models/user.model';
import {validate} from "../services/ajv_validation";
import * as schemas from "../resources/schemas.json";

const addSupportTier = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        if (isNaN(parseInt(id, 10))) {
            res.status(400).json({ error: 'Bad Request. Invalid user ID' });
            return;
        }
        const { title, description, cost } = req.body;
        if (!title || !description || typeof cost === 'undefined' || cost < 0) {
            res.status(400).send('Bad Request: Missing required fields');
            return;
        }
        const validation = await validate(schemas.petition_patch, req.body);
        if (validation !== true) {
            res.status(400).send('Bad Request: Invalid information');
            return;
        }

        const authToken = req.headers['x-authorization'];
        const ownerId = await getIdByToken(authToken);
        const petition = await Petition.getOne(parseInt(id, 10));

        if (!petition) {
            res.status(404).send('Not found');
            return;
        }
        if (petition.owner_id !== ownerId) {
            res.status(403).send('Forbidden: Only the owner of a petition may modify it');
            return;
        }
        const existingSupportTiers = await SupportTiers.getSupportTiers(parseInt(id, 10));
        if (existingSupportTiers.length >= 3) {
            res.status(403).send('Forbidden: Cannot add a support tier if 3 already exist');
            return;
        }
        const titleExists = existingSupportTiers.some(tier => tier.title === title);
        if (titleExists) {
            res.status(403).send('Forbidden: Support title not unique within petition');
            return;
        }
        await SupportTiers.createSupportTier(parseInt(id, 10), title, description, cost);
        res.status(201).send('OK');
    } catch (err) {
        Logger.error(err);
        res.status(500).send('Internal Server Error');
    }
};

const editSupportTier = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, tierId } = req.params;
        const { title, description, cost } = req.body;
        if (title === null && description === null && cost === null) {
            res.status(400).send('Bad Request: No fields to update');
            return;
        }
        const validation = await validate(schemas.support_tier_patch, req.body);
        if (validation !== true) {
            res.status(400).send('Bad Request: Invalid information');
            return;
        }
        const authToken = req.headers['x-authorization'];
        const ownerId = await getIdByToken(authToken);
        const petition = await Petition.getOne(parseInt(id, 10));
        if (petition.ownerId !== ownerId) {
            res.status(403).send('Forbidden: Only the owner of a petition may modify it');
            return;
        }
        if (!petition) {
            res.status(404).send('Not found');
            return;
        }
        const supportTier = await Petition.getOne(parseInt(tierId, 10));
        if (!supportTier) {
            res.status(404).send('Not Found: Support tier not found');
            return;
        }
        const hasSupporters = await Petition.hasSupporters(parseInt(tierId, 10));
        if (hasSupporters) {
            res.status(403).send('Forbidden: Cannot edit a support tier if a supporter already exists for it');
            return;
        }
        const existingSupportTiers = await SupportTiers.getSupportTiers(parseInt(id, 10));
        const titleExists = existingSupportTiers.some(tier => tier.title === title && tier.id !== parseInt(tierId, 10));
        if (titleExists) {
            res.status(403).send('Forbidden: Support title not unique within petition');
            return;
        }
        const currentSupTier = await SupportTiers.getSupportTierById(parseInt(tierId, 10));
        const { id: currentId, title: currentTitle, description: currentDescription, cost: currentCost } = currentSupTier;
        let titleToUpdate = '';
        let descToUpdate = '';
        let costToUpdate = 0;
        if (title == null) {
            titleToUpdate = currentTitle;
        } else {
            titleToUpdate = title;
        }
        if (description == null) {
            descToUpdate = currentDescription;
        } else {
            descToUpdate = description;
        }
        if (cost == null) {
            costToUpdate = currentCost;
        } else {
            costToUpdate = cost;
        }
        await SupportTiers.updateSupportTier(parseInt(tierId, 10), titleToUpdate, descToUpdate, costToUpdate);
        res.status(200).send('OK');
    } catch (err) {
        Logger.error(err);
        res.status(500).send('Internal Server Error');
    }
};

const deleteSupportTier = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, tierId } = req.params;
        if (isNaN(parseInt(id, 10)) || isNaN(parseInt(tierId, 10))) {
            res.status(400).json({ error: 'Bad Request. Invalid user ID' });
            return;
        }
        const authToken = req.headers['x-authorization'];
        const ownerId = await getIdByToken(authToken);
        const petition = await Petition.getOne(parseInt(id, 10));
        if (petition.owner_id !== ownerId) {
            res.status(401).send('Forbidden: Only the owner of a petition may delete a support tier');
            return;
        }
        const validation = await validate(schemas.support_tier_patch, req.body);
        if (validation !== true) {
            res.status(400).send('Bad Request: Invalid information');
            return;
        }
        const supportTier = await SupportTiers.getSupportTierById(parseInt(tierId, 10));
        if (!supportTier) {
            res.status(404).send('Not Found: Support tier not found');
            return;
        }
        const hasSupporters = await Petition.hasSupporters(parseInt(tierId, 10));
        if (hasSupporters) {
            res.status(403).send('Forbidden: Cannot delete a support tier if a supporter already exists for it');
            return;
        }
        const supportTiers = await SupportTiers.getSupportTiers(parseInt(id, 10));
        if (supportTiers.length === 1) {
            res.status(403).send('Forbidden: Cannot remove the only support tier for a petition');
            return;
        }
        await SupportTiers.deleteSupportTier(parseInt(tierId, 10));
        res.status(200).send('OK');
    } catch (err) {
        Logger.error(err);
        res.status(500).send('Internal Server Error');
    }
};

export {addSupportTier, editSupportTier, deleteSupportTier};