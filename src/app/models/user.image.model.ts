import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import {fs} from "mz";

const checkUserExists = async (userId: number): Promise<boolean> => {
    const conn = await getPool().getConnection();
    const [rows] = await conn.query('SELECT COUNT(*) AS count FROM user WHERE id = ?', [userId]);
    const count = rows[0].count;
    return count > 0;
}

const filepath = './storage/images/';
const readImage = async (fileName: string) : Promise<[Buffer, string]> => {
    const image = await fs.readFile(filepath + fileName);
    const mimeType = getImageMimetype(fileName);
    return [image, mimeType];
}

const getImageMimetype = (filename: string): string => {
    if (filename.endsWith('.jpeg')) return 'image/jpeg';
    if (filename.endsWith('.jpg')) return 'image/jpg';
    if (filename.endsWith('.png')) return 'image/png';
    if (filename.endsWith('.gif')) return 'image/gif';
    return 'application/octet-stream';
}
const getUserImageFilename = async (userId: number): Promise<string | null> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT image_filename FROM user WHERE id = ?';
    const result = await conn.query(query, [userId]);
    if (result && result.length > 0 && result[0].length > 0) {
        const { image_filename } = result[0][0];
        Logger.info(`Image filename: ${image_filename}`);
        return image_filename;
    }
    return null;

};

const updateUserImageFilename = async (userId: number, filename: string): Promise<void> => {
    const conn = await getPool().getConnection();
    const query = 'UPDATE user SET image_filename = ? WHERE id = ?';
    await conn.query(query, [filename, userId]);
};

const saveUserImageFile = async (userId: number, extension: string, imageData: Buffer): Promise<void> => {
    const imagePath = `${__dirname}/../../../storage/images/user_${userId}.${extension}`;
    await fs.promises.writeFile(imagePath, imageData);
    await updateUserImageFilename(userId, `user_${userId}.${extension}`);
};


export {checkUserExists, readImage, getUserImageFilename, updateUserImageFilename, saveUserImageFile}