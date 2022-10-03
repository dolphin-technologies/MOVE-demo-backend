import * as jwt from "jsonwebtoken";
import {randomBytes} from "crypto";

export const jwtSecret = process.env.MOVE_SECRET_KEY || randomBytes(64).toString("base64url");
export const jwtAlgorithm = "HS512";

export function signJwt(payload: object): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, jwtSecret, {algorithm: jwtAlgorithm}, (err, token) => {
      if (err || !token) {
        reject(err);
      } else {
        resolve(token);
      }
    });
  });
}

export function verifyJwt(token: string): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err || !decoded) {
        reject(err);
      } else {
        resolve(decoded as jwt.JwtPayload);
      }
    });
  });
}
