import * as axios from "axios";

const MOVE_SDK_BASE_URL = process.env.MOVE_SDK_BASE_URL || "https://sdk.dolph.in";
const MOVE_SDK_PROJECT_ID = parseInt(process.env.MOVE_PROJECT_ID as string);
const MOVE_SDK_API_KEY = process.env.MOVE_SDK_API_KEY as string;

const client = new axios.Axios({
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

export async function getTokenForUser(userId: string, deviceId: string): Promise<MoveSdkTokenResponse> {
  const response = await client.post("/sdk-auth/v1_5/jwt/registeruser", {
    installationId: deviceId,
    contractId: userId,
  });

  return response.data;
}
