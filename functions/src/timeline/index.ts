import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import * as admin from "firebase-admin";

import { ensureLoggedIn } from "../commonHandlers";
import * as move from "../move";

/**
 * handlers for interacting with the MOVE timeline
 */

function timelineHandler(firestore: admin.firestore.Firestore): Router {
  const router = Router();

  router.get("/", ensureLoggedIn(firestore), getAllHandler());
  router.get("/:id/details", ensureLoggedIn(firestore), getDetailsHandler());

  return router;
}

function getAllHandler(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = res.locals.email;
    if (!userId) {
      res.status(403);
      res.end("you must be logged in to fetch timeline items");
      return;
    }

    const fromQuery = req.query["from"];
    if (typeof fromQuery !== "string") {
      res.status(400);
      res.end("from is a required parameter");
      return;
    }
    const from = parseInt(fromQuery);
    if (isNaN(from)) {
      res.status(400);
      res.end("from must be a number");
      return;
    }

    const toQuery = req.query["to"];
    if (typeof toQuery !== "string") {
      res.status(400);
      res.end("from is a required parameter");
      return;
    }
    const to = parseInt(toQuery);
    if (isNaN(to)) {
      res.status(400);
      res.end("from must be a number");
    }

    const items = await move.getTimeline(userId, from, to) || [];
    const formattedItems = items.map(formatItem);

    res.json({
      status: { code: 0 },
      data: {
        timelineItemBaseList: formattedItems
      }
    });
  }
}

function getDetailsHandler() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = res.locals.email;
    if (!userId) {
      res.status(403);
      res.end("you must be logged in to fetch timeline items");
      return;
    }

    const idParam = parseInt(req.params["id"]);
    if (typeof idParam !== "string") {
      res.status(400);
      res.end("id is a required parameter");
      return;
    }
    const id = parseInt(idParam);
    if (isNaN(id)) {
      res.status(400);
      res.end("id must be a number");
      return;
    }

    const startTs = id;

    const item = await move.getTimelineItem(userId, startTs);
    if (!item) {
      res.status(404);
      res.end("item not found");
      return;
    }

    const formatted: any = formatItem(item);

    const previousId = await findPreviousId(item);
    const nextId = await findNextId(item);

    formatted.previousTripId = previousId;
    formatted.nextTripId = nextId;

    if (item.type === "CAR") {
      const points = await move.getPoints(userId, startTs) || [];

      formatted.tripPoints = points.map(p => {
        return {
          isoTime: p.timestamp,
          lat: p.lat.toString(),
          lon: p.lon.toString(),
          roadLat: p.wayPointInfo?.origLat,
          roadLon: p.wayPointInfo?.origLon,
          altitude: 0, // TODO: needed?
          speed: p.wayPointInfo?.speed,
          speedLimit: p.wayPointInfo?.speedLimit,
          colour: speedColour(p.wayPointInfo?.speed, p.wayPointInfo?.speedLimit),
          wayType: p.wayPointInfo?.wayType,
        }
      });

      const durationMinutes = (new Date(item.endTs).getTime() - new Date(item.startTs).getTime()) / (60 * 1000);
      formatted.distractionDetails = distractionDetails(item.features.phoneDistractions.secondsPerType, durationMinutes);

      formatted.distractionEvents = item.features.phoneDistractions.distractions.map(d => {
        return {
          type: mapDistractionType(d.type),
          startIsoTime: d.start,
          endIsoTime: d.end,
        };
      });

      formatted.sectionDistance = sectionDistances(points);

      formatted.drivingEvents = item.features.drivingBehaviorEvents.events.map(e => {
        return {
          time: e.timestamp,
          lat: e.lat,
          lon: e.lon,
          value: e.strength,
          type: mapDBEType(e.type),
        };
      });
    }
  };
}

async function findPreviousId(item: move.TimelineItem): Promise<number | undefined> {
  const itemsBefore = await move.getTimeline(item.userId, 0, Math.floor(new Date(item.startTs).getTime() / 1000) - 1, 1) || [];
  const itemBefore = itemsBefore[0];
  if (itemBefore) {
    return Math.floor(new Date(itemBefore.startTs).getTime() / 1000);
  } else {
    return undefined;
  }
}

// NOTE: this will only find a next item if it is within a day from a current item
async function findNextId(item: move.TimelineItem): Promise<number | undefined> {
  const endUnixTs = Math.floor(new Date(item.endTs).getTime() / 1000);
  const itemsAfter = await move.getTimeline(item.userId, endUnixTs + 1, endUnixTs + 3600 * 24) || [];
  const itemAfter = itemsAfter[itemsAfter.length - 1] // items are returned in descending order -> the last item is the first after the current item
  if (itemAfter) {
    return Math.floor(new Date(itemAfter.startTs).getTime() / 1000);
  } else {
    return undefined;
  }
}

function speedColour(speed: number | undefined, speedLimit: number | undefined): string {
  if (!speed || !speedLimit || speed <= speedLimit) {
    return "GREEN";
  } else if (speed <= speedLimit * 1.1) {
    return "YELLOW"
  } else {
    return "RED";
  }
}

function mapDistractionType(distractionType: string): string | undefined {
  if (distractionType === "SWIPE_AND_TYPE") {
    return "SWP_TYPE";
  } else if (distractionType === "PHONE_CALL") {
    return "PH_HHELD";
  } else if (distractionType === "PHONE_CALL_HANDS_FREE") {
    return "PH_HFREE"
  } else {
    return undefined;
  }
}

function mapDBEType(dbeType: string): string | undefined {
  if (dbeType === "ACCELERATION") {
    return "ACC";
  } else if (dbeType === "CORNERING") {
    return "CRN";
  } else if (dbeType === "BREAKING") {
    return "BRK";
  } else {
    return undefined;
  }
}

function formatItem(i: move.TimelineItem) {
  const start = new Date(i.startTs);
  const end = new Date(i.endTs);

  const id = Math.floor(start.getTime() / 1000);

  const scoreFeature = i.features.scores;
  const safeness = Math.round(((scoreFeature.get("ACCELERATION") || 100) + (scoreFeature.get("CORNERING") || 100) + (scoreFeature.get("BRAKING") || 100)) / 3.0);
  const speed = scoreFeature.get("SPEED") || 100;
  const distraction = scoreFeature.get("SPEED") || 100;
  const total = Math.round((speed + safeness + distraction) / 3.0);
  const scores = {
    speed,
    distraction,
    safeness,
    total,
  };

  return {
    id,

    type: i.type,

    startTs: i.startTs,
    endTs: i.endTs,

    startAddress: "",
    endAddress: "",

    scores,

    distanceMeters: i.features.gpsStats.distance,
    averageSpeedKph: i.features.gpsStats.averageSpeed,
    durationMinutes: Math.round((end.getTime() - start.getTime()) / (60 * 1000)),
  };
}

function sectionDistances(points: move.WayPoint[]): { green: number, yellow: number, red: number } {
  let prev: move.WayPoint | undefined;

  let result = { green: 0.0, yellow: 0.0, red: 0.0 }

  for (const point of points) {
    if (!prev) {
      prev = point;
    } else {
      const distance = haversine(prev, point);

      const speed = point.wayPointInfo?.speed;
      const speedLimit = point.wayPointInfo?.speedLimit;

      if (!speed || !speedLimit || speed <= speedLimit) {
        result.green += distance;
      } else if (speed <= speedLimit * 1.1) {
        result.yellow += distance;
      } else {
        result.red += distance;
      }
    }
  }

  return result;
}

function distractionDetails(secondsPerType: Map<string, number>, durationMinutes: number): {
  distractedSwipeTypeMinutes: number,
  distractedPhoneHandheldMinutes: number,
  distractionFreeMinutes: number,
  totalDistractedMinutes: number,
  distractedSwipeTypePct: number,
  distractedPhoneHandheldPct: number,
  distractionFreePct: number,
} {
  const phoneCallMinutes = Math.floor((secondsPerType.get("PHONE_CALL") || 0) / 60);
  const swipeAndTypeMinutes = Math.floor((secondsPerType.get("SWIPE_AND_TYPE") || 0) / 60);
  const phoneCallHandHeldMinutes = Math.floor((secondsPerType.get("PHONE_CALL_HANDS_FREE") || 0) / 60);
  const distractedMinutes = phoneCallMinutes + swipeAndTypeMinutes;
  const distractionFreeMinutes = Math.max(0, durationMinutes - distractedMinutes);

  return {
    distractedSwipeTypeMinutes: swipeAndTypeMinutes,
    distractedPhoneHandheldMinutes: phoneCallMinutes,
    distractionFreeMinutes,
    totalDistractedMinutes: distractedMinutes,

    distractionFreePct: 100 * distractionFreeMinutes / durationMinutes,
    distractedPhoneHandheldPct: 100 * phoneCallHandHeldMinutes / durationMinutes,
    distractedSwipeTypePct: 100 * swipeAndTypeMinutes / durationMinutes,
  }
}

function haversine(a: move.WayPoint, b: move.WayPoint) {
  const lat1 = toRadians(a.lat), lon1 = toRadians(a.lon), lat2 = toRadians(b.lat), lon2 = toRadians(b.lon);
  const R = 6372.8; // km

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const c = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const d = 2 * Math.asin(Math.sqrt(c));
  return R * d;
}

function toRadians(deg: number): number {
  return deg / 180.0 * Math.PI;
}

export default timelineHandler;
