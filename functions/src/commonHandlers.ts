import { Request, Response, RequestHandler } from "express";
import { verifyJwt } from "./jwt";
import { UserRepository } from "./users/db/repository";

export function handleExceptions(handler: RequestHandler): RequestHandler {
    return async (req, res, next) => {
        try {
            await handler(req, res, next);
        } catch(e) {
            next(e);
        }
    };
}

export function notImplemented(_req: Request, res: Response) {
    res.status(500);
    res.end("not implemented");
}

export function ensureLoggedIn(repository: UserRepository): RequestHandler {
    return async (req, res, next) => {
        const authHeader = req.header("Authorization");
        if (!authHeader) {
            res.status(401);
            res.end("auth header not present");
            return;
        }

        if (!authHeader.startsWith("Bearer ")) {
            res.status(401);
            res.end("only 'Bearer' auth is supported");
            return;
        }

        const token = authHeader.substring("Bearer ".length).trim();

        try {
            const decoded = await verifyJwt(token);
            if (!decoded.id) {
                res.status(401);
                res.end("invalid jwt");
                return;
            }

            const user = await repository.getUserById(decoded.id);
            if (!user) {
                res.status(401);
                res.end("user with id " + decoded.id + " does not exist!");
                return;
            }

            if (user.loggedOut) {
                res.status(401);
                res.end("user with id " + decoded.id + " was logged out!");
                return;
            }

            res.locals.authenticated = true;
            res.locals.userId = decoded.id;
            if (decoded.email) {
                res.locals.email = decoded.email;
            }
            res.locals.decodedJwt = decoded;

            next();
        } catch (e) {
            res.status(401);
            res.end("invalid jwt");
            return;
        }
    };
}
