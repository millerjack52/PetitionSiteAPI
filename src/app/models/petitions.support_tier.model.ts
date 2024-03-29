import {getPool} from "../../config/db";
import Logger from '../../config/logger';

const getSupportTiers = async (petitionId: number): Promise<any[]> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT * FROM support_tier WHERE petition_id = ?';
    const [rows] = await conn.query(query, [petitionId]);
    return rows;
};

const createSupportTier = async (petitionId: number, title: string, description: string, cost: number): Promise<void> => {
    const conn = await getPool().getConnection();
    const query = 'INSERT INTO support_tier (petition_id, title, description, cost) VALUES (?, ?, ?, ?)';
    await conn.query(query, [petitionId, title, description, cost]);
    conn.release();
};

const updateSupportTier = async (tierId: number, title: string, description: string, cost: number): Promise<void> => {
    const conn = await getPool().getConnection();
    await conn.query('UPDATE support_tier SET title = ?, description = ?, cost = ? WHERE id = ?', [title, description, cost, tierId]);
    conn.release();
};

const getSupportTierById = async (tierId: number): Promise<any> => {
    const conn = await getPool().getConnection();
    const [rows] = await conn.query('SELECT id, title, description, cost FROM support_tier WHERE id = ?', [tierId]);
    Logger.info(`${JSON.stringify(rows[0])} in getSupportTierById`)
    if (rows.length > 0) {
        return rows[0];
    } else {
        return null;
    }
};

const deleteSupportTier = async (tierId: number): Promise<void> => {
    const conn = await getPool().getConnection();
    const supportTier = await conn.query('SELECT * FROM support_tier WHERE id = ?', [tierId]);
    if (supportTier.length === 0) {
        throw new Error('Support tier not found');
    }
    await conn.query('DELETE FROM support_tier WHERE id = ?', [tierId]);
    conn.release();
};

export {getSupportTiers, createSupportTier, updateSupportTier, getSupportTierById, deleteSupportTier}