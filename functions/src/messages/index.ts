import { Router, RequestHandler } from "express";
import { MessageStateRepository } from "./db/repository";

/**
 * TODO: this is just a mock implementation for messages. It's necessary because the app won't start without these endpoints being available.
 */

const SELF_URL = process.env.SELF_URL;

type UpdateMessagesRequest = {
    messages: [{
        id: number,
        read: boolean
    }]
}

const TEST_MESSAGE = {
    id: 0,

    title: "Welcome",
    text: "<html><body><h1>Welcome</h1><p>Welcome to the Move App</p></body></html>",

    iconType: "DEFAULT",
    topic: "info",
    sentTime: "1970-01-01T00:00:00.000Z",
}

const MESSAGE_SPECS = [ TEST_MESSAGE ];

function messagesHandler(authMiddleware: RequestHandler, repository: MessageStateRepository): Router {
    const router = Router();

    router.get("/", authMiddleware, getAllHandler(repository));
    router.patch("/", authMiddleware, updateMessagesHandler(repository));
    router.post("/tokens", authMiddleware, receiveDeviceToken());

    router.get("/:id/content", messageContentHandler());

    return router;
}

type MessageSpec = {
    id: number,

    title: string,
    text?: string,
    url?: string,

    iconType?: string,
    topic?: string,
    sentTime?: string,
}

function toResponseMessage(m: MessageSpec) {
    return {
        id: m.id,
        iconType: m.iconType,
        text: m.title,
        url: m.url ? m.url : `${SELF_URL}/api/v1/messages/${m.id}/content`,
        topic: "info",
        sentTime: "1970-01-01T00:00:00.000Z",
    };
}

function getAllHandler(repository: MessageStateRepository): RequestHandler {
    return async (_req, res) => {
        const userId = res.locals.userId as string;

        const messages = await Promise.all(MESSAGE_SPECS.map(async (m) => {
             return {
                ...toResponseMessage(m),
                read: (await repository.getMessageState(userId, m.id.toString()))?.read || false,
             };
        }));

        res.json({
            status: { code: 0 },
            data: {
                messages,
                deletedIds: []
            }
        });
    }
}

function updateMessagesHandler(repository: MessageStateRepository): RequestHandler {
  return async (req, res) => {
        const userId = res.locals.userId as string;
        const body = req.body as UpdateMessagesRequest;

        const updates = body.messages.map((m) => {
            return { userId, messageId: m.id.toString(), read: m.read };
        });
        await repository.updateMessageStates(updates);

        const messages = await Promise.all(MESSAGE_SPECS.map(async (m) => {
            return {
               ...m,
               read: (await repository.getMessageState(userId, m.id.toString()))?.read || false,
            };
       }));

       res.json({
           status: { code: 0 },
           data: {
               messages,
               deletedIds: []
           }
       });
  };
}

function messageContentHandler(): RequestHandler {
    const hostedMessages = MESSAGE_SPECS.filter((m) => m.text);

    return (req, res) => {
        const messageId = parseInt(req.params["id"]);

        const message = hostedMessages.find(m => m.id === messageId);

        if(!message) {
            res.status(404);
            res.end();
        }

        res.setHeader("content-type", "text/html");
        res.end(message?.text);
    }
}

function receiveDeviceToken(): RequestHandler {
    return async (_req, res) => {
        res.json({ status: { code: 0 } });
    }
}

export default messagesHandler;
