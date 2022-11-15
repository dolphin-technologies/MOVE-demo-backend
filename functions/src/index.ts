import * as functions from "firebase-functions";
import * as firebaseAdmin from "firebase-admin";
import * as express from "express";

import usersHandler from "./users";
import timelineHandler from "./timeline";
import messagesHandler from "./messages";

firebaseAdmin.initializeApp();
const firestore = firebaseAdmin.firestore();

const app = express();


app.use("/api/v1/users", usersHandler(firestore));
app.use("/api/v1/timeline", timelineHandler(firestore));
app.use("/api/v1/messages", messagesHandler());

export const move = functions.https.onRequest(app);
