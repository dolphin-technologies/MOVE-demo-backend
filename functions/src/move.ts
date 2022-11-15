import * as axios from "axios";
import { logger } from "firebase-functions";

/**
 * functions for interacting with the MOVE SDK
 */

const MOVE_SDK_BASE_URL = process.env.MOVE_SDK_BASE_URL || "https://sdk.dolph.in";
const MOVE_SDK_PROJECT_ID = parseInt(process.env.MOVE_SDK_PROJECT_ID as string);
const MOVE_SDK_API_KEY = process.env.MOVE_SDK_API_KEY as string;

const client = axios.default.create({
  baseURL: MOVE_SDK_BASE_URL,
  auth: {
    username: MOVE_SDK_PROJECT_ID.toString(),
    password: MOVE_SDK_API_KEY,
  },
});

export type MoveSdkTokenResponse = {
  accessToken: string,
  refreshToken: string,
  contractId: string,
  audience: string,
  installationId: string,
  productId: number,
}

export type MoveSdkTimelineResponse = TimelineItem[]

export type TimelineItem = {
  projectId: number,
  userId: string,

  startTs: string,
  endTs: string,

  startTimeZone: string | undefined,
  endTimeZone: string | undefined,

  type: string,

  features: TimelineItemFeatures
}

export type TimelineItemFeatures = {
  startLocation: LocationFeature,
  endLocation: LocationFeature,
  source: { id: string, name: string },
  scores: Map<string, number>,
  drivingBehaviorEvents: { events: DrivingBehaviorEvent[], validTime: number },
  phoneDistractions: { distractions: PhoneDistraction[], secondsPerType: Map<string, number> },
  gpsStats: GpsStats,
  transport: { type: string, probabilities: Map<string, number> }
  metas: Map<string, string>,
}

export type LocationFeature = {
  lat: number,
  lon: number,
  name: string | undefined,
  timeZone: string | undefined,
}

export type DrivingBehaviorEvent = {
  timestamp: string,
  type: string,
  strength: number,
  lat: number,
  lon: number,
  rawAccel: number,
}

export type PhoneDistraction = {
  type: string,
  start: string,
  end: string,
}

export type GpsStats = {
  distance: number,
  maxSpeed: number,
  averageSpeed: number,
}

export type WayPoint = {
  timestamp: string,
  lat: number,
  lon: number,
  wayPointInfo: {
    speed: number | undefined,
    speedLimit: number | undefined,
    wayType: string | undefined,
    origLat: number | undefined,
    origLon: number | undefined,
    dangerousAreaId: string | undefined,
  } | undefined,
}

export async function getTokenForUser(userId: string): Promise<MoveSdkTokenResponse | undefined> {
  try {
    const response = await client.post("/v20/auth/register", {
      userId,
    }, {
      headers: { "authorization": MOVE_SDK_API_KEY }
    });

    return response.data;
  } catch (e: any) {
    if (e instanceof axios.AxiosError) {
      logger.error("AxiosError: ", { error: e });
    }
    throw e;
  }
}

export async function getTimeline(userId: string, from: number, to: number, limit: number | undefined = undefined): Promise<MoveSdkTimelineResponse | undefined> {
  try {
    const params: any = {
      projectId: MOVE_SDK_PROJECT_ID,
      userId,
      from,
      to,
    };
    if (limit) {
      params["limit"] = limit;
    }

    const response = await client.get("/v20/timeline", {
      auth: { username: MOVE_SDK_PROJECT_ID.toString(), password: MOVE_SDK_API_KEY },
      params
    });

    console.log(response);
    console.log(response.data);

    const rawItems = response.data;

    return rawItems ? rawItems.map(parseItem) : undefined;
  } catch (e: any) {
    if (e instanceof axios.AxiosError) {
      logger.error("AxiosError: ", { error: e });
    }
    throw e;
  }
}

export async function getTimelineItem(userId: string, startTs: number): Promise<TimelineItem | undefined> {
  try {
    const response = await client.get(`/v20/timeline/${startTs}`, {
      auth: { username: MOVE_SDK_PROJECT_ID.toString(), password: MOVE_SDK_API_KEY },
      params: {
        projectId: MOVE_SDK_PROJECT_ID,
        userId
      }
    });

    return parseItem(response.data);
  } catch (e: any) {
    if (e instanceof axios.AxiosError) {
      logger.error("AxiosError: ", { error: e });
    }
    throw e;
  }
}

export async function getPoints(userId: string, startTs: number): Promise<WayPoint[] | undefined> {
  try {
    const response = await client.get(`/v20/timeline/${startTs}/points`, {
      auth: { username: MOVE_SDK_PROJECT_ID.toString(), password: MOVE_SDK_API_KEY },
      params: {
        projectId: MOVE_SDK_PROJECT_ID,
        userId
      }
    });

    return response.data;
  } catch (e: any) {
    if (e instanceof axios.AxiosError) {
      logger.error("AxiosError: ", { error: e });
    }
    throw e;
  }
}

function parseItem(i: any): TimelineItem {
  if(!i) {
    return i;
  }

  const f = parseFeatures(i.features);
  i.features = f;

  return i;
}

function parseFeatures(f: any): TimelineItemFeatures {
  if(!f) {
    return f;
  }

  if(f.metas) {
    const metas = new Map(Object.entries(f.metas));
    f.metas = metas;
  }

  if(f.scores) {
    const scores = new Map(Object.entries(f.scores));
    f.scores = scores;
  }

  if(f.phoneDistractions && f.phoneDistractions.secondsPerType) {
    const secondsPerType = new Map(Object.entries(f.phoneDistractions.secondsPerType));
    f.phoneDistractions.secondsPerType = secondsPerType;
  }

  if(f.transport && f.transport.probabilities) {
    const probabilities = new Map(Object.entries(f.transport.probabilities));
    f.transport.probabilities = probabilities;
  }

  return f;
}
