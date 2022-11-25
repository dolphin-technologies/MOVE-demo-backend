import { Router, RequestHandler } from "express";
import { logger } from "firebase-functions";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";

import { ensureLoggedIn, handleExceptions } from "../commonHandlers";
import { signJwt } from "../jwt";
import { getTokenForUser } from "../move";
import { UserRepository } from "./db/repository";

type RegisterUserRequest = {
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    phone: string,
    company: string,
    gender: string,
};

type RefreshTokenRequest = {
    refreshToken: string
};

type LoginRequest = {
    email: string,
    password: string,
}

type UpdateUserRequest = {
    firstName: string,
    lastName: string,
    gender: string,
    email: string,
    phone: string,
    company: string,

    password: string,
}

type UpdatePasswordRequest = {
    password: string,
    newPassword: string,
}

type DeleteRequest = {
    password: string,
}

function usersHandler(userRepository: UserRepository): Router {
    const router = Router();

    router.get("/", ensureLoggedIn(userRepository), getUserHandler(userRepository));
    router.post("/", registerHandler(userRepository));
    router.patch("/", ensureLoggedIn(userRepository), updateUserHandler(userRepository));

    router.post("/login", loginHandler(userRepository));
    router.post("/logout", ensureLoggedIn(userRepository), logoutHandler(userRepository));

    router.post("/tokens/products", refreshTokenHandler(userRepository));
    router.get("/tokens/sdks", ensureLoggedIn(userRepository), sdkRefreshTokenHandler());

    router.put("/passwords", ensureLoggedIn(userRepository), updatePasswordHandler(userRepository));

    router.post("/delete", ensureLoggedIn(userRepository), deleteUserHandler(userRepository));

    return router;
}

function getUserHandler(repository: UserRepository): RequestHandler {
    return handleExceptions(async (_req, res, next) => {
        const id = res.locals.userId as string;

        const userData = await repository.getUserById(id);
        if (!userData) {
            res.status(404);
            res.end("user does not exist");
            return;
        }

        res.json({
            status: {
                code: 0,
            },
            data: {
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                phone: userData.phone,
                registrationDate: userData.registrationDate,
                contractId: userData.email,
                gender: userData.gender,
                company: userData.company,
                consents: [],
                fields: {},
            },
        });
    });
}

function registerHandler(repository: UserRepository): RequestHandler {
    return handleExceptions(async (req, res, next) => {
        const body: RegisterUserRequest = req.body;

        const passwordHash = await hashPassword(body.password);
        const refreshToken = crypto.randomBytes(64).toString("base64url");

        const userRecord = {
            email: body.email,
            phone: body.phone,
            firstName: body.firstName,
            lastName: body.lastName,

            company: body.company,
            gender: body.gender,

            passwordHash,
            refreshToken,
        };

        const user = await repository.createUser(userRecord);

        if (!user) {
            res.status(500);
            res.end("could not create user");
            return;
        }

        logger.log("created new user", { user });

        const accessToken = await signJwt({ email: body.email, id: user.id });
        const sdkUserLoginInfo = await getTokenForUser(user.id);

        res.json({
            status: {
                code: 0,
            },
            data: {
                contractId: user.id,
                productAuthInfo: {
                    accessToken,
                    refreshToken,
                },
                sdkUserLoginInfo,
                consents: [],
            },
        });
    });
}

function loginHandler(repository: UserRepository): RequestHandler {
    return handleExceptions(async (req, res, next) => {
        const body: LoginRequest = req.body;

        const email = body.email;
        const pass = body.password;

        if (!email || !pass) {
            res.status(400);
            res.end("email and password is needed");
            return;
        }

        const userRecord = await repository.getUserByEmail(email);
        if (!userRecord) {
            res.status(404);
            res.end(`user with email ${email} does not exist!`);
            return;
        }

        const hash = userRecord.passwordHash;
        const valid = await verifyPassword(hash, pass);
        if (!valid) {
            res.status(401);
            res.end("wrong password");
            return;
        }


        const accessToken = await signJwt({ email: body.email, id: userRecord.id });
        const refreshToken = crypto.randomBytes(64).toString("base64url");
        repository.updateUser({ id: userRecord.id, refreshToken })

        const sdkUserLoginInfo = await getTokenForUser(body.email);

        res.json({
            status: {
                code: 0,
            },
            data: {
                contractId: body.email,
                productAuthInfo: {
                    accessToken,
                    refreshToken,
                },
                sdkUserLoginInfo,
            },
        });
    });
}

function logoutHandler(repository: UserRepository): RequestHandler {
    return handleExceptions(async (req, res) => {
        const id = res.locals.userId as string;

        await repository.updateUser({ id, loggedOut: true });
    });
}

function refreshTokenHandler(repository: UserRepository): RequestHandler {
    return handleExceptions(async (req, res) => {
        const body: RefreshTokenRequest = req.body;

        const id = req.header("x-app-contractid");
        if (!id) {
            res.status(400);
            res.end("contractid not provided");
            return;
        }

        const userRecord = await repository.getUserById(id);
        const recordRefreshToken = userRecord?.refreshToken

        if (!userRecord || recordRefreshToken !== body.refreshToken) {
            res.status(401);
            res.end("wrong refresh token");
            return;
        }

        const accessToken = await signJwt({ email: userRecord.email, id: userRecord.id });
        const refreshToken = crypto.randomBytes(64).toString("base64url");

        await repository.updateUser({ id, refreshToken });

        res.json({
            status: {
                code: 0,
            },
            data: {
                productAuthInfo: {
                    accessToken,
                    refreshToken,
                },
            },
        });
    });
}

function sdkRefreshTokenHandler(): RequestHandler {
    return handleExceptions(async (req, res) => {
        const id = res.locals.userId as string;
        const sdkUserLoginInfo = await getTokenForUser(id);

        if (!sdkUserLoginInfo) {
            res.status(500);
            res.end("could not refresh token");
            return;
        }

        res.json({
            status: {
                code: 0
            },
            data: {
                sdkUserLoginInfo
            }
        });
    });
}

function updateUserHandler(repository: UserRepository): RequestHandler {
    return handleExceptions(async (req, res) => {
        const id = res.locals.userId as string;
        const body: UpdateUserRequest = req.body;

        const user = await repository.getUserById(id);
        if (!user) {
            res.status(404);
            res.end("user not found");
            return;
        }

        await repository.updateUser({
            id,
            firstName: body.firstName,
            lastName: body.lastName,
            email: body.email,
            phone: body.phone,
            gender: body.gender,
            company: body.company,
        });

        res.json({
            status: {
                code: 0,
            }
        });
    });
}

function updatePasswordHandler(repository: UserRepository): RequestHandler {
    return handleExceptions(async (req, res) => {
        const id = res.locals.userId as string;
        const body: UpdatePasswordRequest = req.body;

        const user = await repository.getUserById(id);
        if (!user) {
            res.status(404);
            res.end("user not found");
            return;
        }

        if (!await verifyPassword(user.passwordHash, body.password)) {
            res.status(401);
            res.end("invalid password");
            return;
        }

        await repository.updateUser({ id, passwordHash: await hashPassword(body.newPassword) });

        res.json({
            status: {
                code: 0,
            }
        });
    });
}

function deleteUserHandler(repository: UserRepository): RequestHandler {
    return handleExceptions(async (req, res) => {
        const id = res.locals.userId as string;
        const body: DeleteRequest = req.body;

        const user = await repository.getUserById(id);
        if (!user) {
            res.status(404);
            res.end("user not found");
            return;
        }

        if (!await verifyPassword(user.passwordHash, body.password)) {
            res.status(401);
            res.end("invalid password");
            return;
        }

        await repository.deleteUser(id);

        res.json({
            status: {
                code: 0,
            }
        });
    });
}

async function hashPassword(pw: string) {
    return await bcrypt.hash(pw, 10);
}

async function verifyPassword(hash: string, pw: string) {
    return await bcrypt.compare(pw, hash);
}

export default usersHandler;
