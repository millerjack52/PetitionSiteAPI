import {Request, Response} from "express";
import Logger from "../../config/logger";
import {readImage} from "../models/user.image.model";
import {getPetitionImageFilename, savePetitionImage} from '../models/petition.image.model'
import * as Petition from "../models/petitions.model";
import {getIdByToken} from '../models/user.model'

const getImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            res.status(400).json({ error: 'Id must be an integer' });
            return;
        }
        const filename = await getPetitionImageFilename(userId);
        if (!filename) {
            res.status(404).json({ error: 'Not Found. User has no image' });
            return;
        }
        const [image, mimeType] = await readImage(filename);
        res.status(200).contentType(mimeType).send(image);
    } catch (err) {
        Logger.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const setImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const petitionId = parseInt(req.params.id, 10);

        if (isNaN(petitionId)) {
            res.status(400).json({ error: 'Bad Request. Invalid petition ID' });
            return;
        }
        const authToken = req.headers['x-authorization'];
        const ownerId = await getIdByToken(authToken);
        const petition = await Petition.getOne(petitionId);
        if (!petition) {
            res.status(404).send('Not Found: No petition found with id');
            return;
        }
        if (petition.ownerId !== ownerId) {
            res.status(403).json({ error: 'Forbidden. Only the owner of a petition can change the hero image' });
            return;
        }
        if (!req.body || !Buffer.isBuffer(req.body)) {
            res.status(400).json({ error: 'Bad Request. No image data found in the request body' });
            return;
        }
        const contentType = req.headers['content-type'];
        let extension = '';
        switch (contentType) {
            case 'image/png':
                extension = 'png';
                break;
            case 'image/jpeg':
                extension = 'jpeg';
                break;
            case 'image/gif':
                extension = 'gif';
                break;
            default:
                res.status(400).json({ error: 'Bad Request. Invalid content type. Supported types: image/png, image/jpeg, image/gif' });
                return;
        }

        if (petition.image_filename) {
            await savePetitionImage(petitionId, extension, req.body);
            res.status(200).json({ message: 'OK. Image updated' });
        } else {
            await savePetitionImage(petitionId, extension, req.body);
            res.status(201).json({ message: 'Created. Image added' });
        }
    } catch (err) {
        Logger.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


export {getImage, setImage};