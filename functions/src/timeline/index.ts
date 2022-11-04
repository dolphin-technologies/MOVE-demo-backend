import {Router, Request, Response, NextFunction, RequestHandler} from "express";

/**
 * handlers for interacting with the MOVE timeline
 */

function timelineHandler(): Router {
  const router = Router();

  router.get("/", getAllHandler());

  return router;
}

function getAllHandler(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const fromQuery = req.query["from"];
    if(typeof fromQuery !== "string") {
        res.status(400);
        res.end("from is a required parameter");
        return;
    }
    const from = parseInt(fromQuery);
    if(isNaN(from)) {
        res.status(400);
        res.end("from must be a number");
        return;
    }

    const toQuery = req.query["to"];
    if(typeof toQuery !== "string") {
        res.status(400);
        res.end("from is a required parameter");
        return;
    }
    const to = parseInt(toQuery);
    if(isNaN(to)) {
        res.status(400);
        res.end("from must be a number");
    }

    res.json({
      status: { code: 0 },
      data: {
        timelineItemBaseList: []
      }
    });
  }
}

export default timelineHandler;
