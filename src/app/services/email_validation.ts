import { getPool } from '../../config/db';

const checkEmailExists = async (email: string): Promise<boolean> => {
    const conn = await getPool().getConnection();
    try {
        const[rows] = await conn.query('select count(*) as count from user where email = ?', [email]);
        const count = rows[0].count;
        return count > 0;
    } finally {
        conn.release();
    }
};

const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export {checkEmailExists, isValidEmail};