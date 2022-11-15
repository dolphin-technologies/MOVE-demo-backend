import * as jwt from "jsonwebtoken";
import {randomBytes} from "crypto";

/**
 * functions for generating and verifying jwt tokens
 */

export const jwtSecret = process.env.MOVE_SECRET_KEY || randomBytes(64).toString("base64url");
export const jwtAlgorithm = "HS512";

/**
 * async function that generates new JWTs with the given payload
 * If the environment variable MOVE_SECRET_KEY is present it is used as the signing key, otherwise a random key will be used.
 * 
 * @param payload the JWT payload
 * @returns a signed JWT token
 */
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

/**
 * async function that verifies the given token with the key from the MOVE_SECRET_KEY environment variable (or a random key if it was not present)
 * if the token is not valid an exception is thrown
 * 
 * @param token the token to verify
 * @returns the JWT payload
 */
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
