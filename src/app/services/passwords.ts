import bcrypt from 'bcrypt';
import { uid } from 'rand-token';

const hash = async (password: string): Promise<string> => {
    const encrypted = await bcrypt.hash(password, 10);
    return encrypted;
}

const compare = async (password: string, comp: string): Promise<boolean> => {
    return await bcrypt.compare(password, comp);
}

const generateToken = (): string => {
    const token = uid(16);
    return token;
}

export {hash, compare, generateToken}