import { notFound } from "next/navigation";
import moment from "moment";
import Results from "../_components/Results";
import NoWrappedData from "../_components/NoWrappedData";
import { getMockDateInUTCAsync } from "../_utils/utils";
import { fetchMockInsights } from "./_lib/fetchMockInsights";

export default async function MocksInsightsPage() {
  // if it's before results day, show not found
  if (
    moment()
      .utc()
      .isBefore(await getMockDateInUTCAsync("results_day"))
  ) {
    notFound();
  }

  const insightsData = await fetchMockInsights();

  if (!insightsData) {
    notFound();
  }

  // Show message if user has no completed mocks (no wrapped data)
  if (insightsData.paperInsights.length === 0) {
    return <NoWrappedData />;
  }

  return <Results insightsData={insightsData} />;
}
