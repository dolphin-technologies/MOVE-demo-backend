import * as functions from "firebase-functions";
import * as firebaseAdmin from "firebase-admin";
import * as express from "express";

import usersHandler from "./users";
import timelineHandler from "./timeline";
import messagesHandler from "./messages";
import { FirebaseUserRepository } from "./users/db/firestore";
import { ensureLoggedIn } from "./commonHandlers";

firebaseAdmin.initializeApp();
const firestore = firebaseAdmin.firestore();
const userRepository = new FirebaseUserRepository(firestore);

const app = express();
app.disable("x-powered-by");


app.use("/api/v1/users", usersHandler(userRepository));
app.use("/api/v1/timeline", ensureLoggedIn(userRepository), timelineHandler());
app.use("/api/v1/messages", ensureLoggedIn(userRepository), messagesHandler());

// error handler
const errorHandler: express.ErrorRequestHandler = (err, _req, res) => {
    if(!err.status) {
        err.status = 500;
    }
    if(!err.code) {
        err.code = -1000;
    }

    functions.logger.error("encountered unhandled exception ", err);

    res.status(err.status);
    res.json({
        status: { code: err.code },
        error: err.message,
    });
}
app.use(errorHandler);

export const move = functions.https.onRequest(app);
