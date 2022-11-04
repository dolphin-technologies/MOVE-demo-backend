import {Router, Request, Response, NextFunction, RequestHandler} from "express";

/**
 * TODO: this is just a mock implementation for messages. It's necessary because the app won't start without these endpoints being available.
 */

function messagesHandler(): Router {
  const router = Router();

  router.get("/", getAllHandler());
  router.post("/tokens", receiveDeviceToken())

  return router;
}

function getAllHandler(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.json({ 
      status: { code: 0 },
      data: {
        messages: [],
        deletedIds: []
      }
    });
  }
}

function receiveDeviceToken(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.json({ status: { code: 0 } });
  }
}

export default messagesHandler;
