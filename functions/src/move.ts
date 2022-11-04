import * as axios from "axios";
import {logger} from "firebase-functions";

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

type MoveSdkTokenResponse = {
    accessToken: string,
    refreshToken: string,
    contractId: string,
    audience: string,
    installationId: string,
    productId: number,
}

type MoveSdkTimelineResponse = [ TimelineItem ]

type TimelineItem = {
    projectId: number,
    userId: string,

    startTs: string,
    endTs: string,

    startTimeZone: string | undefined,
    endTimeZone: string | undefined,

    type: string,

    features: TimelineItemFeatures
}

type TimelineItemFeatures = {
    startLocation: LocationFeature,
    endLocation: LocationFeature,
    source: { id: string, name: string },
    scores: Map<string, number>,
    drivingBehaviorEvents: { events: [ DrivingBehaviorEvent ], validTime: number },
    phoneDistractions: { distractions: [ PhoneDistraction ], secondsPerType: Map<string, number> },
    gpsStats: GpsStats,
    transport: { type: string, probabilities: Map<string, number> }
    metas: Map<string, string>,
}

type LocationFeature = {
    lat: number,
    lon: number,
    name: string | undefined,
    timeZone: string | undefined,
}

type DrivingBehaviorEvent = {
    timestamp: string,
    type: string,
    strength: number,
    lat: number,
    lon: number,
    rawAccel: number,
}

type PhoneDistraction = {
    type: string,
    start: string,
    end: string,
}

type GpsStats = {
    distance: number,
    maxSpeed: number,
    averageSpeed: number,
}

export async function getTokenForUser(userId: string): Promise<MoveSdkTokenResponse | undefined> {
  try {
    const response = await client.post("/v20/auth/register", {
      userId,
    }, {
      headers: { "authorization": MOVE_SDK_API_KEY }
    });

    return response.data;
  } catch(e: any) {
    if(e instanceof axios.AxiosError) {
      logger.error("AxiosError: ", { error: e });
    }
    throw e;
  }
}

export async function getTimeline(userId: string, from: number, to: number): Promise<MoveSdkTimelineResponse | undefined> {
  try {
    const response = await client.post("/v20/timeline", {
      projectId: MOVE_SDK_PROJECT_ID,
      userId,
      from,
      to,
    }, {
      auth: { username: MOVE_SDK_PROJECT_ID.toString(), password: MOVE_SDK_API_KEY }
    });

    return response.data;
  } catch(e: any) {
    if(e instanceof axios.AxiosError) {
      logger.error("AxiosError: ", { error: e });
    }
    throw e;
  }
}
