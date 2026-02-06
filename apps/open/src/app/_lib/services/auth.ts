import axios from "axios";
import { AuthProviderOptions } from "../../types/types";

const CURRICULUM_API_URL = process.env.NEXT_PUBLIC_CURRICULUM_API_URL;

async function authenticateWithDatabaseApi(
  providerIdToken: string,
  provider: AuthProviderOptions,
  providerAccessToken?: string
): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  try {
    if (!providerIdToken) {
      throw new Error("No ID token provided");
    }

    const providerEndpoint = provider === "credentials" ? "firebase" : provider;
    const response = await axios.post(
      `${CURRICULUM_API_URL}/auth/provider/${providerEndpoint}`,
      {
        provider_token: providerIdToken,
        provider_access_token: providerAccessToken,
        client_type: "web",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const { access_token: accessToken, refresh_token: refreshToken } =
      response.data;

    if (!accessToken || !refreshToken) {
      throw new Error("Invalid response: Missing access or refresh token");
    }

    return { accessToken, refreshToken };
  } catch (error) {
    throw error;
  }
}

export { authenticateWithDatabaseApi };
