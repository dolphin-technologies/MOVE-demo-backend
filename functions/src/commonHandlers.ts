import {Request, Response, NextFunction} from "express";
import * as admin from "firebase-admin";
import {verifyJwt} from "./jwt";

export function notImplemented(_req: Request, res: Response) {
  res.status(500);
  res.end("not implemented");
}

export function ensureLoggedIn(_firestore: admin.firestore.Firestore) {
  return async (req: Request, res: Response, next: NextFunction) => {
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
      if (!decoded.email) {
        res.status(401);
        res.end("invalid jwt");
        return;
      }

      res.locals.authenticated = true;
      res.locals.email = decoded.email;
      res.locals.decodedJwt = decoded;

      next();
    } catch (e) {
      res.status(401);
      res.end("invalid jwt");
      return;
    }
  };
}
