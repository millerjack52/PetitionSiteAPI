import {getPool} from "../../config/db";

const getAllSupportersForPetition = async (petitionId: number): Promise<any[]> => {
    const conn = await getPool().getConnection();
    const [rows] = await conn.query(`
        SELECT s.id, s.support_tier_id, s.user_id, s.message, s.timestamp, u.first_name, u.last_name
        FROM supporter s
        JOIN user u ON s.user_id = u.id
        WHERE s.petition_id = ?
        ORDER BY s.timestamp ASC
    `, [petitionId]);
    conn.release();
    return rows;
};

const alreadySupported = async (userId: number, petitionId: number, supportTierId: number): Promise<boolean> => {
    const conn = await getPool().getConnection();
    const [rows] = await conn.query('SELECT * FROM supporter WHERE user_id = ? AND petition_id = ? AND support_tier_id = ?', [userId, petitionId, supportTierId]);
    conn.release();
    return rows.length > 0;
};
const addNewSupporter = async (userId: number, petitionId: number, supportTierId: number, message: string): Promise<void> => {
    const conn = await getPool().getConnection();
    await conn.query('INSERT INTO supporter (user_id, petition_id, support_tier_id, message) VALUES (?, ?, ?, ?)', [userId, petitionId, supportTierId, message]);
    conn.release();
};

export {getAllSupportersForPetition, addNewSupporter, alreadySupported}