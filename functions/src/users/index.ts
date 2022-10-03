import {Router, Request, Response, NextFunction, RequestHandler} from "express";
import {logger} from "firebase-functions";
import * as admin from "firebase-admin";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";

import {ensureLoggedIn, notImplemented} from "../commonHandlers";
import {signJwt} from "../jwt";
import {getTokenForUser} from "../move";

type RegisterUserRequest = {
    name: string,
    email: string,
    password: string,
    phone: string,
};

type RefreshTokenRequest = {
    refreshToken: string
};

type LoginRequest = {
    email: string,
    password: string,
}

function usersHandler(firestore: admin.firestore.Firestore): Router {
  const router = Router();

  router.get("/", ensureLoggedIn, getUserHandler(firestore));
  router.post("/", registerHandler(firestore));
  router.patch("/", ensureLoggedIn, notImplemented);

  router.post("/login", loginHandler(firestore));
  router.post("/logout", ensureLoggedIn, logoutHandler(firestore));

  router.post("/tokens/products", refreshTokenHandler(firestore));
  router.post("/tokens/sdk", notImplemented);

  router.post("/delete", ensureLoggedIn, notImplemented);

  return router;
}

function getUserHandler(firestore: admin.firestore.Firestore): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const email = res.locals.email as string;

    const userRecord = await firestore.doc(email).get();
    const userData = userRecord.data();
    if (!userRecord || !userRecord.exists || !userData) {
      res.status(404);
      res.end("user does not exist");
      return;
    }

    res.json({
      status: {
        code: 0,
      },
      data: {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        registrationDate: Date.now(),
        constractId: userData.email,
        gender: "na",
        company: "na",
        consents: [],
        fields: {},
      },
    });
  };
}

function registerHandler(firestore: admin.firestore.Firestore): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const body: RegisterUserRequest = req.body;

    try {
      const passwordHash = await bcrypt.hash(body.password, 10);

      const accessToken = await signJwt({email: body.email});
      const refreshToken = crypto.randomBytes(64).toString("base64url");

      const userRecord = {
        email: body.email,
        phone: body.phone,
        name: body.name,

        passwordHash,
        refreshToken,
      };

      await firestore.collection("users")
          .doc(body.email)
          .set(userRecord);

      logger.log("created new user", {user: userRecord});

      const appId = req.header("x-app-appid");
      const sdkUserLoginInfo = await getTokenForUser(body.email, appId || "");

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
          consents: [],
        },
      });
    } catch (e: any) {
      next(e);
    }
  };
}

function loginHandler(firestore: admin.firestore.Firestore): RequestHandler {
  return async (req, res, next) => {
    const body: LoginRequest = req.body;

    const email = body.email;
    const pass = body.password;

    if (!email || !pass) {
      res.status(400);
      res.end("email or password is needed");
      return;
    }

    try {
      const userRecord = await firestore.collection("users").doc(email).get();
      if (!userRecord || !userRecord.exists) {
        res.status(404);
        res.end(`user with email ${email} does not exist!`);
        return;
      }

      const hash: string = userRecord.get("passwordHash");
      const valid = bcrypt.compare(pass, hash);
      if (!valid) {
        res.status(401);
        res.end("wrong password");
        return;
      }


      const accessToken = signJwt({email: body.email});
      const refreshToken = crypto.randomBytes(64).toString("base64url");

      await firestore.doc(email).update({
        refreshToken,
      });

      const appId = req.header("x-app-appid");
      const sdkUserLoginInfo = await getTokenForUser(body.email, appId || "");

      res.json({
        status: {
          code: 0,
        },
        data: {
          productAuthInfo: {
            accessToken,
            refreshToken,
          },
          sdkUserLoginInfo,
        },
      });
    } catch (e) {
      next(e);
    }
  };
}

function logoutHandler(firestore: admin.firestore.Firestore): RequestHandler {
  return async (req, res, next) => {
    const email = res.locals.email as string;

    firestore.doc(email).update({loggedOut: true});
  };
}

function refreshTokenHandler(firestore: admin.firestore.Firestore): RequestHandler {
  return async (req, res, next) => {
    const body: RefreshTokenRequest = req.body;

    const email = req.header("x-app-contractid");
    if (!email) {
      res.status(400);
      res.end("contractid not provided");
      return;
    }

    const userRecord = await firestore.collection("users").doc(email).get();
    const recordRefreshToken = userRecord.get("refreshToken") as string;

    if (recordRefreshToken !== body.refreshToken) {
      res.status(401);
      res.end("wrong refresh token");
      return;
    }

    const accessToken = await signJwt({email});
    const refreshToken = crypto.randomBytes(64).toString("base64url");

    await firestore.collection("users").doc(email).update({refreshToken});

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
  };
}

export default usersHandler;
