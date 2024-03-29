import {getPool} from "../../config/db";
import * as pTypes from '../petition_types';

const viewAll = async (searchQuery: pTypes.PetitionSearchQuery): Promise<pTypes.PetitionReturn> => {
    const conn = await getPool().getConnection();
    let query = `
        SELECT
            COUNT(DISTINCT p.id) AS totalCount
        FROM
            petition p
        LEFT JOIN
            supporter s ON p.id = s.petition_id
        LEFT JOIN
            user u ON p.owner_id = u.id
    `;
    const whereConditions: string[] = [];
    const values: any[] = [];
    if (searchQuery.q && searchQuery.q !== '') {
        whereConditions.push('(p.title LIKE ? OR p.description LIKE ?)');
        values.push(`%${searchQuery.q}%`, `%${searchQuery.q}%`);
    }
    if (searchQuery.categoryIds && searchQuery.categoryIds.length > 0) {
        whereConditions.push('p.category_id IN (?)');
        values.push(searchQuery.categoryIds);
    }
    if (searchQuery.supportingCost > 0) {
        whereConditions.push('EXISTS (SELECT 1 FROM support_tier WHERE petition_id = p.id AND cost <= ?)');
        values.push(searchQuery.supportingCost);
    }
    if (searchQuery.ownerId > 0) {
        whereConditions.push('p.owner_id = ?');
        values.push(searchQuery.ownerId);
    }
    if (searchQuery.supporterId > 0) {
        whereConditions.push('EXISTS (SELECT 1 FROM supporter WHERE petition_id = p.id AND user_id = ?)');
        values.push(searchQuery.supporterId);
    }
    if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
    }
    const [totalCountRows] = await conn.query(query, values);
    const totalCount = totalCountRows[0].totalCount;
    query = `
        SELECT
            p.id AS petitionId,
            p.title,
            p.description,
            p.creation_date AS creationDate,
            p.image_filename AS imageFilename,
            p.owner_id AS ownerId,
            p.category_id AS categoryId,
            COUNT(s.id) AS numberOfSupporters,
            (SELECT MIN(cost) FROM support_tier WHERE petition_id = p.id) AS supportingCost,
            u.first_name AS ownerFirstName,
            u.last_name AS ownerLastName
        FROM
            petition p
        LEFT JOIN
            supporter s ON p.id = s.petition_id
        LEFT JOIN
            user u ON p.owner_id = u.id
    `;
    if (whereConditions.length > 0) {
        query += ' WHERE ' + whereConditions.join(' AND ');
    }
    query += `
        GROUP BY
            p.id, p.title, p.description, p.creation_date, p.image_filename, p.owner_id, p.category_id, u.first_name, u.last_name
    `;
    switch (searchQuery.sortBy) {
        case 'ALPHABETICAL_ASC':
            query += ' ORDER BY p.title ASC';
            break;
        case 'ALPHABETICAL_DESC':
            query += ' ORDER BY p.title DESC';
            break;
        case 'COST_ASC':
            query += ' ORDER BY supportingCost ASC';
            break;
        case 'COST_DESC':
            query += ' ORDER BY supportingCost DESC';
            break;
        case 'CREATED_DESC':
            query += ' ORDER BY p.creation_date DESC';
            break;
        default:
            query += ' ORDER BY p.creation_date ASC';
    }
    if (searchQuery.count >= 0) {
        query += ' LIMIT ?';
        values.push(parseInt(searchQuery.count.toString(), 10));
    }
    if (searchQuery.startIndex !== undefined && searchQuery.startIndex > 0) {
        query += ' OFFSET ?';
        values.push(parseInt(searchQuery.startIndex.toString(), 10));
    }
    const [petitionRows] = await conn.query(query, values);
    return { petitions: petitionRows, count: totalCount };
};

const getOne = async (petitionId: number): Promise<any> => {
    const conn = await getPool().getConnection();
    let petition: any = null;
    const [petitionRows] = await conn.query('SELECT * FROM petition WHERE id = ?', [petitionId]);
    if (petitionRows.length === 0) {
        return null;
    }
    petition = petitionRows[0];
    const [ownerRows] = await conn.query('SELECT id AS ownerId, first_name AS ownerFirstName, last_name AS ownerLastName FROM user WHERE id = ?', [petition.owner_id]);
    const owner = ownerRows[0];
    const [supportTierRows] = await conn.query('SELECT title, description, cost, id AS supportTierId FROM support_tier WHERE petition_id = ?', [petitionId]);
    const supportTiers = supportTierRows.map((row: any) => ({
        title: row.title,
        description: row.description,
        cost: row.cost,
        supportTierId: row.supportTierId
    }));
    petition.ownerId = owner.ownerId;
    petition.ownerFirstName = owner.ownerFirstName;
    petition.ownerLastName = owner.ownerLastName;
    petition.supportTiers = supportTiers;
    conn.release();
    return petition;
};

const getCats = async (values: any[] = []): Promise<any> => {
    const conn = await getPool().getConnection();
    const query = 'SELECT * FROM category';
    const [rows] = await conn.query(query, values);
    conn.release();
    return rows;
};

const checkCategoryExists = async (categoryId: number): Promise<boolean> => {
    const conn = await getPool().getConnection();
    let categoryExists = false;
    const [categoryRows] = await conn.query('SELECT COUNT(*) AS count FROM category WHERE id = ?', [categoryId]);
    categoryExists = categoryRows[0].count > 0;
    conn.release();
    return categoryExists;
};

const checkTitleUnique = async (title: string): Promise<boolean> => {
    const conn = await getPool().getConnection();
    let isUnique = true;
    const [titleRows] = await conn.query('SELECT COUNT(*) AS count FROM petition WHERE title = ?', [title]);
    isUnique = titleRows[0].count === 0;
    conn.release();
    return isUnique;
};

const insertPetition = async (ownerId: number, title: string, description: string, categoryId: number, supportTiers: any[]): Promise<number> => {
    const conn = await getPool().getConnection();
    let petitionId: number;
    const [insertPetitionResult] = await conn.query('INSERT INTO petition (owner_id, title, description, category_id, creation_date) VALUES (?, ?, ?, ?, NOW())', [ownerId, title, description, categoryId]);
    petitionId = insertPetitionResult.insertId;
    for (const supportTier of supportTiers) {
        await conn.query('INSERT INTO support_tier (title, description, cost, petition_id) VALUES (?, ?, ?, ?)', [supportTier.title, supportTier.description, supportTier.cost, petitionId]);
    }
    conn.release();
    return petitionId;
};

const updatePetition = async (petitionId: number, title: string, description: string, categoryId: number): Promise<void> => {
    const conn = await getPool().getConnection();
    let query = 'UPDATE petition SET ';
    const params: any[] = [];
    if (title) {
        query += 'title = ?, ';
        params.push(title);
    }
    if (description) {
        query += 'description = ?, ';
        params.push(description);
    }
    if (categoryId) {
        query += 'category_id = ?, ';
        params.push(categoryId);
    }
    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(petitionId);
    await conn.query(query, params);
    conn.release();

};

const hasSupporters = async (petitionId: number): Promise<boolean> => {
    const conn = await getPool().getConnection();
    const [result] = await conn.query('SELECT COUNT(*) AS count FROM supporter WHERE petition_id = ?', [petitionId]);
    const count = result[0].count;
    conn.release();
    return count > 0;

};

const deletePetition = async (petitionId: number): Promise<void> => {
    const conn = await getPool().getConnection();
    await conn.query('DELETE FROM petition WHERE id = ?', [petitionId]);
    conn.release();

};

export { viewAll, getOne, getCats, checkCategoryExists, checkTitleUnique, insertPetition, updatePetition, hasSupporters, deletePetition };
