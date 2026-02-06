import moment from "moment";
import { notFound, redirect } from "next/navigation";
import { getMockDateInUTCAsync } from "../_utils/utils.server";
import MocksRegistrationClient from "./_components/MocksRegistrationClient";
import { fetchMockRegistration } from "./_lib/fetchMockRegistration";

export default async function MocksRegistrationPage() {
  // if it's after mocks end, show not found
  if (
    moment()
      .utc()
      .isAfter(await getMockDateInUTCAsync("mocks_end"))
  ) {
    notFound();
  }

  // if it's after results date, redirect to results page
  if (
    moment()
      .utc()
      .isAfter(await getMockDateInUTCAsync("results_day"))
  ) {
    redirect("/mocks/results");
  }

  // Fetch user's registration data server-side
  const data = await fetchMockRegistration();

  // Check if registration is open based on current date
  const registrationOpenDate =
    await getMockDateInUTCAsync("registration_opens");
  const isRegistrationOpen = moment().utc().isAfter(registrationOpenDate);

  return (
    <MocksRegistrationClient
      initialData={data}
      isRegistrationOpen={isRegistrationOpen}
    />
  );
}
