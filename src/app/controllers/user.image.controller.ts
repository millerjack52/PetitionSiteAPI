import {Request, Response} from "express";
import Logger from "../../config/logger";
import fs from 'fs/promises';
import {checkUserExists, getUserImageFilename, readImage, saveUserImageFile, updateUserImageFilename} from "../models/user.image.model"
import {authenticateUser} from "../services/authentication";

const getImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            res.status(400).json({ error: 'Id must be an integer' });
            return;
        }
        const filename = await getUserImageFilename(userId);
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
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            res.status(400).json({ error: 'Bad Request. Invalid user ID' });
            return;
        }
        const userExists = await checkUserExists(userId);
        if (!userExists) {
            res.status(404).json({ error: 'Not Found. No user with specified ID' });
            return;
        }
        if (!req.body) {
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
        await saveUserImageFile(userId, extension, req.body);
        res.status(201).json({ message: 'OK. Image updated' });
    } catch (err) {
        Logger.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const deleteImage = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            res.status(400).json({ error: 'Bad Request. Invalid user ID' });
            return;
        }
        const authToken = req.headers['x-authorization'];
        if (!authToken) {
            res.status(401).json({ error: 'Forbidden. Cannot delete another user\'s profile photo' });
            return;
        }
        const isAuthenticated = await authenticateUser(userId, authToken);
        Logger.info(`${isAuthenticated}`)
        if (!isAuthenticated) {
            res.status(403).json({ error: 'Unauthorized. Invalid authentication token' });
            return;
        }
        const userExists = await checkUserExists(userId);
        if (!userExists) {
            res.status(404).json({ error: 'Not Found. No user with specified ID' });
            return;
        }
        const filename = await getUserImageFilename(userId);
        if (!filename) {
            res.status(404).json({ error: 'Not Found. User has no image' });
            return;
        }
        const imagePath = `${__dirname}/../../../storage/images/${filename}`;
        await fs.unlink(imagePath);
        await updateUserImageFilename(userId, '');
        res.status(200).json({ message: 'OK. Image deleted' });
    } catch (err) {
        Logger.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


export {getImage, setImage, deleteImage}