import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import {fs} from "mz";
import path from 'path';

const getPetitionImageFilename = async (petitionId: number): Promise<string | null> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT image_filename FROM petition WHERE id = ?';
    const result = await conn.query(query, [petitionId]);
    conn.release();
    if (result && result.length > 0 && result[0].length > 0) {
        const { image_filename } = result[0][0];
        Logger.info(`Image filename: ${image_filename}`);
        return image_filename;
    }
    return null;
};

const savePetitionImage = async (petitionId: number, extension: string, imageData: Buffer): Promise<void> => {
    const imagePath = path.resolve(__dirname, `../../../storage/images/petition_${petitionId}.${extension}`);
    await fs.promises.writeFile(imagePath, imageData);
    await updatePetitionImageFilename(petitionId, `petition_${petitionId}.${extension}`);
};

const updatePetitionImageFilename = async (petitionId: number, filename: string): Promise<void> => {
    const conn = await getPool().getConnection();
    const query = 'UPDATE petition SET image_filename = ? WHERE id = ?';
    await conn.query(query, [filename, petitionId]);
    conn.release();
};


export {getPetitionImageFilename, savePetitionImage}