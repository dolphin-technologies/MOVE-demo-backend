import * as functions from "firebase-functions";
import * as firebaseAdmin from "firebase-admin";
import * as express from "express";

import usersHandler from "./users";
import timelineHandler from "./timeline";

firebaseAdmin.initializeApp();

const app = express();

app.use("/api/v1/users", usersHandler(firebaseAdmin.firestore()));
app.use("/api/v1/timeline", timelineHandler());

export const move = functions.https.onRequest(app);
