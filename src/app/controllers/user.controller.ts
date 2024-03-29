import {Request, Response} from "express";
import Logger from '../../config/logger';
import {registerUser, loginUser, updateUserToken, updateUserTokenToNull, getUserById, isEmailAvailable, updateUserDetails} from "../models/user.model";
import * as schemas from '../resources/schemas.json';
import {validate} from '../services/ajv_validation';
import {checkEmailExists, isValidEmail} from "../services/email_validation";
import {hash, compare, generateToken} from '../services/passwords';
import {authenticateUser} from "../services/authentication";


const register = async (req: Request, res: Response): Promise<void> => {
    try{
        const userData = req.body;
        const validation = await validate(
            schemas.user_register,
            userData );
        if (validation !== true) {
            res.statusMessage = `Bad request. Invalid information`;
            res.status(400).send();
            return;
        }
        if (await checkEmailExists(userData.email)) {
            Logger.info('Email is in use')
            res.statusMessage = 'Forbidden. Email already in use';
            res.status(403).send();
            return;
        }

        const checkEmail = isValidEmail(userData.email);
        if (!checkEmail) {
            Logger.info('Email is invalid')
            res.statusMessage = 'Forbidden. Email invalid';
            res.status(400).send();
            return;
        }
        userData.password = await hash(userData.password);
        const result = await registerUser(userData);
        Logger.info(`${userData}`)
        res.status(201).send({ 'userId': result.insertId });
        return;
    } catch (err) {
        Logger.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const login = async (req: Request, res: Response): Promise<void> => {
    try{
        const{ email, password } = req.body;

        const user = await loginUser(email);
        Logger.info(`${user.email} in login controller`)
        const validation = await validate(schemas.user_login, req.body );
        if (validation !== true) {
            res.status(400).json({ error: 'Bad request. Invalid information' });
            return;
        }
        if (!user) {
            res.status(401).json({ error: 'Unauthorised. Invalid email/password' });
            return;
        }
        const isPasswordMatch = await compare(password, user.password);
        if (!isPasswordMatch) {
            res.statusMessage = "UnAuthorised. Incorrect email/password";
            res.status(401).send();
            return;
        }

        const userToken = generateToken();
        await updateUserToken(user.id, userToken);
        res.status(200).json({ userId: user.id, token: userToken });
    } catch (err) {
        Logger.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const logout = async (req: Request, res: Response): Promise<void> => {
    try{
        const authToken = req.headers['x-authorization'];
        if (!authToken) {
            res.status(401).json({ error: 'Unauthorized. Cannot log out if you are not authenticated' });
            return;
        }
        await updateUserTokenToNull(authToken);
        res.status(200).json({ message: 'OK' })
    } catch (err) {
        Logger.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const view = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = parseInt(id, 10);
        if (isNaN(userId)) {
            res.status(400).json({ error: 'Bad request. Invalid user ID' });
            return;
        }
        const authToken = req.headers['x-authorization'];
        if (!authToken) {
            res.status(401).json({ error: 'Unauthorized. Authentication token is missing.' });
            return;
        }
        const userData = await getUserById(userId);
        if (!userData) {
            res.status(404).json({ error: 'Not Found. No user with specified ID' });
            return;
        }
        const isAuthenticated = await authenticateUser(userId, authToken); // Make sure to await authenticateUser
        if (isAuthenticated) {
            const isOwnDetails = userData.auth_token === authToken;
            if (isOwnDetails) {
                res.status(200).json({
                    email: userData.email,
                    firstName: userData.first_name,
                    lastName: userData.last_name
                });
            } else {
                res.status(200).json({
                    firstName: userData.first_name,
                    lastName: userData.last_name
                });
            }
        } else {
            res.status(200).json({
                firstName: userData.first_name,
                lastName: userData.last_name
            });
        }
    } catch (err) {
        Logger.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const update = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const {email, firstName, lastName, password, currentPassword} = req.body;
        const userId = parseInt(id, 10);

        if (isNaN(userId)) {
            res.status(400).json({ error: 'Bad request. Invalid user ID' });
            return;
        }
        const userData = await getUserById(userId);
        const dbPassword = userData.password;
        const authToken = req.headers['x-authorization'];
        const isAuthenticated = await authenticateUser(userId, authToken);
        if (!isAuthenticated) {
            res.status(401).json({ error: 'Forbidden. Cannot edit another user\'s information' });
            return;
        }
        if (Object.keys(req.body).length <= 1) {
            res.status(400).json({ error: 'Bad request. Request body is empty' });
            return;
        }
        const validation = await validate(schemas.user_edit, req.body);
        if (!validation) {
            res.status(400).json({ error: 'Bad request. Invalid information' });
            return;
        }
        if (password) {
            if (password === currentPassword) {
                res.status(403).json({ error: 'Forbidden. Identical current and new passwords' });
                return;
            }
            if (!currentPassword) {
                res.status(400).json({ error: 'Bad request. currentPassword is required to change password' });
                return;
            }
            const isPasswordMatch = await compare(currentPassword, dbPassword);
            if (!isPasswordMatch) {
                res.status(401).json({ error: 'Invalid currentPassword' });
                return;
            }
            await updateUserDetails(userId, { password });
        }
        if (email) {
            const checkEmail = isValidEmail(email);
            if (!checkEmail) {
                res.status(400).json({ error: 'Bad request. Invalid email format' });
                return;
            }
            const emailAvailable = await isEmailAvailable(email);
            if (!emailAvailable) {
                res.status(403).json({ error: 'Forbidden. Email is already in use' });
                return;
            }
            await updateUserDetails(userId, { email });
        }
        if (firstName || lastName) {
            await updateUserDetails(userId, { firstName, lastName });
        }
        res.status(200).json({ message: 'OK' });
    } catch (err) {
        Logger.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export {register, login, logout, view, update}