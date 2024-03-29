import { Request, Response } from "express";
import Logger from '../../config/logger';
import * as Petition from '../models/petitions.model';
import * as schemas from '../resources/schemas.json';
import { validate } from "../services/ajv_validation";
import * as pTypes from '../petition_types';
import {getIdByToken} from '../models/user.model'

const getAllPetitions = async (req: Request, res: Response): Promise<void> => {
    try {
        const validation = await validate(schemas.petition_search, req.query);
        if (validation !== true) {
            res.statusMessage = `Bad Request: ${validation.toString()}`;
            res.status(400).send();
            return;
        }
        let search: pTypes.PetitionSearchQuery = {
            q: '',
            startIndex: 0,
            count: -1,
            categoryIds: [],
            supportingCost: 0,
            ownerId: -1,
            supporterId: -1,
            sortBy: 'CREATED_ASC'
        };
        search = { ...search, ...req.query } as pTypes.PetitionSearchQuery;
        const petitions = await Petition.viewAll(search);
        res.status(200).json(petitions);
    } catch (err) {
        Logger.error(err);
        res.status(500).send('Internal Server Error');
    }
};

const getPetition = async (req: Request, res: Response): Promise<void> => {
    try {
        const petitionId = parseInt(req.params.id, 10);
        const petition = await Petition.getOne(petitionId);
        if (!petition) {
            res.status(404).json({ message: 'Petition not found' });
            return;
        }
        const response = {
            petitionId: petition.id,
            title: petition.title,
            categoryId: petition.category_id,
            ownerId: petition.ownerId,
            ownerFirstName: petition.ownerFirstName,
            ownerLastName: petition.ownerLastName,
            numberOfSupporters: petition.numberOfSupporters, // You need to calculate this value
            creationDate: petition.creation_date,
            description: petition.description,
            moneyRaised: petition.moneyRaised, // You need to calculate this value
            supportTiers: petition.supportTiers
        };
        res.status(200).json(response);
    } catch (err) {
        Logger.error(err);
        res.status(500).send('Internal Server Error');
    }
};

const addPetition = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, categoryId, supportTiers } = req.body;
        const authToken = req.headers['x-authorization'];
        const ownerId = await getIdByToken(authToken);
        if (!authToken || !ownerId) {
            res.status(401).json({ error: 'Forbidden. Not authorized' });
            return;
        }
        if (!title || !description || !categoryId || !Array.isArray(supportTiers) || supportTiers.length < 1 || supportTiers.length > 3) {
            res.status(400).send('Bad Request: Invalid request body');
            return;
        }
        const categoryExists = await Petition.checkCategoryExists(categoryId);
        if (!categoryExists) {
            res.status(400).send('Bad Request: Category does not exist');
            return;
        }
        const isTitleUnique = await Petition.checkTitleUnique(title);
        if (!isTitleUnique) {
            res.status(403).send('Forbidden: Petition title already exists');
            return;
        }
        for (const supportTier of supportTiers) {
            if (!supportTier.hasOwnProperty('cost') || supportTier.cost === null) {
                res.status(400).send('Bad Request: Support tier must have a valid cost');
                return;
            }
        }
        const petitionId = await Petition.insertPetition(ownerId, title, description, categoryId, supportTiers);
        res.status(201).json({ petitionId });
    } catch (err) {
        Logger.error(err);
        res.statusMessage = "Internal Server Error";
        res.status(500).send();
        return;
    }
};

const editPetition = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, description, categoryId } = req.body;
        if (isNaN(parseInt(id, 10))) {
            res.status(400).json({ error: 'Bad Request. Invalid user ID' });
            return;
        }
        const validation = await validate(schemas.petition_patch, req.body);
        if (validation !== true) {
            res.status(400).send('Bad Request: Invalid information');
            return;
        }
        const authToken = req.headers['x-authorization'];
        if (!authToken) {
            res.status(401).send('Unauthorized');
            return;
        }
        const petition = await Petition.getOne(parseInt(id, 10));
        const userId = await getIdByToken(authToken);
        if (!userId || !(userId === petition.owner_id)) {
            res.status(403).send('Unauthorized');
            return;
        }
        if (!petition) {
            res.status(404).send('Not Found: No petition found with id');
            return;
        }
        if (!(title && await Petition.checkTitleUnique(title))) {
            res.status(403).send('Forbidden: Petition title already exists');
            return;
        }
        await Petition.updatePetition(parseInt(id, 10), title, description, categoryId);
        res.status(200).send('OK');
    } catch (err) {
        Logger.error(err);
        res.status(500).send('Internal Server Error');
    }
};

const deletePetition = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const authToken = req.headers['x-authorization'];
        if (!authToken) {
            res.status(401).send('Unauthorized');
            return;
        }
        const petition = await Petition.getOne(parseInt(id, 10));
        if (!petition) {
            res.status(404).send('Not Found: No petition found with id');
            return;
        }
        const userId = await getIdByToken(authToken);
        if (petition.owner_id !== userId) {
            res.status(403).send('Forbidden: Only the owner of a petition may delete it');
            return;
        }
        const hasSupporters = await Petition.hasSupporters(parseInt(id, 10));
        if (hasSupporters) {
            res.status(403).send('Forbidden: Can not delete a petition with one or more supporters');
            return;
        }
        await Petition.deletePetition(parseInt(id, 10));
        res.status(200).send('OK');
    } catch (err) {
        Logger.error(err);
        res.status(500).send('Internal Server Error');
    }
};


const getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const categories = await Petition.getCats();
        res.status(200).json(categories);
    } catch (err) {
        Logger.error(err);
        res.status(500).send('Internal Server Error');
    }
};


export {getAllPetitions, getPetition, addPetition, editPetition, deletePetition, getCategories};