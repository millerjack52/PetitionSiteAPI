import { getPool } from '../../config/db';
import Logger from '../../config/logger';
import { ResultSetHeader } from 'mysql2';
import { User } from '../user_types';
import {hash} from "bcrypt";

const registerUser = async(user: User): Promise<ResultSetHeader> => {
    const conn = await getPool().getConnection();
    const query = 'insert into user (first_name, last_name, email, password) values (?, ?, ?, ?)';
    const[ result ] = await conn.query(query, [user.firstName, user.lastName, user.email, user.password]);
    await conn.release();
    return result;
}

const loginUser = async (email: string): Promise<any> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT id, password FROM user WHERE email = ?';
    const [ result ] = await conn.query(query, [email]);
    await conn.release();
    Logger.info(`${result[0]}, loginUser`)
    return result[0];
}

const updateUserToken = async (id: number, token: string): Promise<void> => {
    const conn = await getPool().getConnection();
    const query = 'UPDATE user SET auth_token = ? WHERE id = ?';
    await conn.query(query, [token, id]);
    await conn.release();
}

const updateUserTokenToNull = async (authToken: string | string[]): Promise<void> => {
    const conn = await getPool().getConnection();
    const query = 'UPDATE user SET auth_token = NULL WHERE auth_token = ?';
    await conn.query(query, [authToken]);
    await conn.release();
}

const getUserById = async (userId: number): Promise<any> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT email, first_name, last_name, password, auth_token FROM user WHERE id = ?';
    const [result] = await conn.query(query, [userId]);
    await conn.release();
    const { email, first_name, last_name, password, auth_token } = result[0];
    return { email, first_name, last_name, password, auth_token };
};

const getTokenById = async (userId: number): Promise<string> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT auth_token FROM user WHERE id = ?';
    const [result] = await conn.query(query, [userId]);
    await conn.release();
    const authTokenObject = result[0];
    let authToken = null;
    if (authTokenObject) {
        authToken = authTokenObject.auth_token;
    }
    return authToken;
};

const getIdByToken = async (authToken: string | string[]): Promise<number> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT id FROM user WHERE auth_token = ?';
    const [result] = await conn.query(query, [authToken]);
    await conn.release();
    const userObject = result[0];
    let userId = null;
    if (userObject) {
        userId = userObject.id;
    }
    return userId;
};


const isEmailAvailable = async (email: string): Promise<boolean> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT COUNT(*) AS count FROM user WHERE email = ?';
    const [rows] = await conn.query(query, [email]);
    await conn.release();
    const count = rows[0].count;
    return count === 0;
};

const updateUserDetails = async (userId: number, userDetails: any): Promise<void> => {
    const { email, firstName, lastName, password } = userDetails;
    let query = 'UPDATE user SET';
    const params: any[] = [];
    if (email) {
        query += ' email = ?,';
        params.push(email);
    }
    if (firstName) {
        query += ' first_name = ?,';
        params.push(firstName);
    }
    if (lastName) {
        query += ' last_name = ?,';
        params.push(lastName);
    }
    if (password) {
        const hashedPassword = await hash(password, 10);
        query += ' password = ?,';
        params.push(hashedPassword);
    }
    query = query.slice(0, -1);
    query += ' WHERE id = ?';
    params.push(userId);
    const conn = await getPool().getConnection();
    await conn.query(query, params);
    conn.release();
};




export{ registerUser, loginUser, updateUserToken, updateUserTokenToNull, getUserById, getTokenById, isEmailAvailable, updateUserDetails, getIdByToken}