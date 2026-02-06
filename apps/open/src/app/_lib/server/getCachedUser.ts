import { fetchUser } from "@/app/_components/sidebar/_lib/fetchUser";
import { cache } from "react";

export const getCachedUser = cache(fetchUser);
