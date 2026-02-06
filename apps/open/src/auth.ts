import { auth as firebaseAuth } from "@/app/_lib/firebase/client";
import { authenticateWithDatabaseApi } from "@/app/_lib/services/auth";
import {
  normalizeEmail,
  verifySignupToken,
  VerificationError,
} from "@/app/_lib/utils/emailVerification";
import axios from "axios";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import NextAuth, { CredentialsSignin, NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import { AuthProviderOptions } from "./app/types/types";

// Map of refresh token -> in-flight refresh promise (deduplicates concurrent refresh calls)
const refreshPromises = new Map<string, Promise<string>>();

declare module "next-auth" {
  interface Session {
    databaseApiAccessToken: string;
    databaseApiRefreshToken: string;
    providerUserId: string;
    authProvider: AuthProviderOptions;
    error?: Error;
  }
  interface User {
    id_token: string;
    providerUserId: string;
    emailVerified?: boolean;
  }
}

class CustomFirebaseError extends CredentialsSignin {
  constructor(code: string = "auth/unknown-error") {
    super();
    this.code = code;
  }
}

const providers: Provider[] = [
  Apple,
  Credentials({
    name: "Credentials",
    credentials: {
      name: { label: "Name", type: "string" },
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      isSignUp: { label: "Is Sign Up", type: "boolean" },
      verificationToken: { label: "Verification Token", type: "string" },
      verificationCode: { label: "Verification Code", type: "string" },
    },
    async authorize(credentials) {
      try {
        const email = normalizeEmail(credentials.email as string);
        let emailVerified = false;

        // For signup, token is required and contains verification info
        if (credentials.isSignUp === "true") {
          if (!credentials.verificationToken) {
            throw new CustomFirebaseError("auth/missing-verification-token");
          }

          // verifySignupToken validates the token and checks if code is needed
          // based on the requiresVerification flag embedded in the token
          const result = await verifySignupToken(
            credentials.verificationToken as string,
            email,
            credentials.verificationCode as string | undefined
          );
          emailVerified = result.emailVerified;
        }

        const userCredential =
          credentials.isSignUp === "true"
            ? await createUserWithEmailAndPassword(
                firebaseAuth,
                email,
                credentials.password as string
              )
            : await signInWithEmailAndPassword(
                firebaseAuth,
                email,
                credentials.password as string
              );

        const user = userCredential.user;
        const idToken = await user.getIdToken();

        return {
          id: user.uid,
          email: user.email,
          id_token: idToken,
          providerUserId: user.uid,
          emailVerified,
        };
      } catch (error) {
        if (error instanceof VerificationError) {
          throw new CustomFirebaseError(error.code);
        }
        if (error instanceof FirebaseError) {
          throw new CustomFirebaseError(error.code);
        }
        throw new CustomFirebaseError();
      }
    },
  }),
];

export const authConfig: NextAuthConfig = {
  trustHost: true, // Required for production deployments behind proxies (e.g., Heroku)
  providers,
  callbacks: {
    // How it should be done?:
    // https://authjs.dev/guides/refresh-token-rotation?framework=next-js
    async jwt({ token, user, account }) {
      if (user) {
        // if it's the first time the user authenticates
        let providerIdToken: string;
        let providerAccessToken: string | undefined;
        let medlyUserId: string;
        let providerUserId: string;
        let userEmail: string;
        const provider = account?.provider as AuthProviderOptions;

        let emailVerified = false;

        switch (provider) {
          case AuthProviderOptions.APPLE:
            if (!account) throw new Error("Account data is missing");
            if (!account.id_token) throw new Error("ID token is missing");
            if (!account.access_token)
              throw new Error("Access token is missing");
            if (!user.email) throw new Error("User email is missing");
            providerIdToken = account.id_token;
            providerAccessToken = account.access_token;
            medlyUserId = user.email;
            providerUserId = account.providerAccountId;
            userEmail = user.email;
            // Apple verifies email during OAuth flow
            emailVerified = true;
            break;
          case AuthProviderOptions.CREDENTIALS:
            if (!user.email) throw new Error("User email is missing");
            if (!user.id) throw new Error("User ID is missing");
            providerIdToken = user.id_token;
            providerAccessToken = undefined;
            medlyUserId = user.id;
            providerUserId = user.id;
            userEmail = user.email;
            // emailVerified is set in authorize() based on token+code validation
            emailVerified = user.emailVerified === true;
            break;
          default:
            throw new Error("Invalid provider");
        }

        // Use the existing NextAuth session for authentication
        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_CURRICULUM_API_URL}/api/v2/users`,
            {
              providerUserId,
              medlyUserId,
              userEmail,
              provider,
              emailVerified,
            }
          );

          if (!response.data?.data?.medlyUserId) {
            throw new Error("Failed to get user data from API");
          }

          medlyUserId = response.data.data.medlyUserId;

          const {
            accessToken: databaseApiAccessToken,
            refreshToken: databaseApiRefreshToken,
          } = await authenticateWithDatabaseApi(
            providerIdToken,
            provider as AuthProviderOptions,
            providerAccessToken
          );

          if (!databaseApiAccessToken || !databaseApiRefreshToken) {
            throw new Error("Failed to authenticate with database API");
          }

          return {
            ...token,
            medlyUserId,
            providerUserId,
            userEmail,
            provider,
            databaseApiAccessToken,
            databaseApiRefreshToken,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          throw error; // Re-throw the error to be handled by NextAuth
        }
      } else if (
        !isTokenExpired(token.databaseApiAccessToken as string) &&
        hasFirebaseUserId(token.databaseApiAccessToken as string)
      ) {
        // If the access token is not expired and already includes firebase_user_id, return the token
        return token;
      } else if (isTokenExpired(token.databaseApiRefreshToken as string)) {
        // If refresh token is expired, return token with error
        token.error = new Error("Refresh token expired");
        return token;
      } else {
        // if the access token is expired, refresh the token
        const refreshToken = token.databaseApiRefreshToken as string;

        // Check if refresh already in progress for this token
        let refreshPromise = refreshPromises.get(refreshToken);

        if (!refreshPromise) {
          // No refresh in progress - start one
          refreshPromise = axios
            .post(`${process.env.NEXT_PUBLIC_CURRICULUM_API_URL}/auth/refresh`, {
              refresh_token: refreshToken,
            })
            .then((response) => response.data.access_token as string)
            .finally(() => {
              refreshPromises.delete(refreshToken);
            });

          refreshPromises.set(refreshToken, refreshPromise);
        }

        try {
          token.databaseApiAccessToken = await refreshPromise;
          return token;
        } catch (error) {
          console.error("Error refreshing token:", error);
          token.error = error;
          return token;
        }
      }
    },
    async session({ session, token }) {
      session.user.id = token.medlyUserId as string;
      session.user.providerUserId = token.providerUserId as string;
      session.user.email = token.userEmail as string;
      session.databaseApiAccessToken = token.databaseApiAccessToken as string;
      session.databaseApiRefreshToken = token.databaseApiRefreshToken as string;
      session.authProvider = token.provider as AuthProviderOptions;
      session.error = token.error as Error;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const providerMap = providers
  .map((provider) => {
    if (typeof provider === "function") {
      const providerData = provider();
      return {
        id: providerData.id,
        name: providerData.name,
        icon: getProviderIcon(providerData.id),
      };
    } else {
      return {
        id: provider.id,
        name: provider.name,
        icon: getProviderIcon(provider.id),
      };
    }
  })
  .filter((provider) => provider.id !== "credentials");

const hasFirebaseUserId = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Boolean(payload.firebase_user_id);
  } catch {
    // If token can't be decoded, treat as missing firebase_user_id
    return false;
  }
};

// Helper function to get provider icons
function getProviderIcon(providerId: string): string {
  switch (providerId.toLowerCase()) {
    case "apple":
      return "/apple_logo.svg";
    default:
      return "default";
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiryTime = payload.exp * 1000 - 10000; // 10s buffer for time between expiry check and call
    return Date.now() >= expiryTime;
  } catch {
    return true; // If token can't be decoded, consider it expired
  }
};
