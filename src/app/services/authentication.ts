import {getTokenById} from "../models/user.model";
import Logger from "../../config/logger";

const authenticateUser = async (userId: number, authToken: string | string[]): Promise<boolean> => {
        const userToken = await getTokenById(userId);
        return userToken !== null && userToken === authToken;
};

export { authenticateUser }