import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");

  if (!urlParam) {
    return NextResponse.json(
      { error: "URL parameter is required" },
      { status: 400 },
    );
  }

  // searchParams.get() already decodes the URL parameter
  // So urlParam should already be decoded
  let url = urlParam;

  // Validate URL format
  try {
    new URL(url);
  } catch {
    // If URL parsing fails, try decoding once more in case it's double-encoded
    try {
      url = decodeURIComponent(urlParam);
      new URL(url); // Validate the decoded URL
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 },
      );
    }
  }

  console.log("Fetching PDF from:", url);

  const attemptFetch = async (targetUrl: string) => {
    return await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Medly/1.0)",
        Accept: "application/pdf,*/*",
      },
      redirect: "follow",
    });
  };

  let response: Response | null = null;
  let lastError: unknown = null;

  // First attempt: original URL
  try {
    response = await attemptFetch(url);
  } catch (err) {
    lastError = err;
  }

  // If first attempt failed or not ok, try alternate protocol
  if (!response || !response.ok) {
    try {
      const original = new URL(url);
      const alt = new URL(url);
      if (original.protocol === "https:") {
        alt.protocol = "http:";
      } else if (original.protocol === "http:") {
        alt.protocol = "https:";
      }

      if (alt.toString() !== original.toString()) {
        console.warn(
          "Primary fetch failed, retrying with alternate protocol:",
          alt.toString(),
        );
        try {
          const retry = await attemptFetch(alt.toString());
          if (retry.ok) {
            response = retry;
          } else {
            // Keep the better of the two responses (prefer non-null)
            response = response ?? retry;
          }
        } catch (err2) {
          lastError = err2;
        }
      }
    } catch (e) {
      // Ignore URL parsing errors for alt
    }
  }

  if (!response) {
    console.error("Fetch failed with no response:", lastError);
    return NextResponse.json(
      { error: "Failed to fetch PDF: network error" },
      { status: 500 },
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    console.error(`Failed to fetch PDF: ${response.status} ${errorText}`);
    return NextResponse.json(
      {
        error: `Failed to fetch PDF: ${response.status} ${response.statusText}`,
      },
      { status: response.status },
    );
  }

  // Verify content type
  const contentType = response.headers.get("content-type");
  if (
    contentType &&
    !contentType.includes("application/pdf") &&
    !contentType.includes("octet-stream")
  ) {
    console.warn(`Unexpected content type: ${contentType}`);
  }

  // Get the PDF data
  const pdfData = await response.arrayBuffer();

  if (pdfData.byteLength === 0) {
    return NextResponse.json({ error: "PDF file is empty" }, { status: 500 });
  }

  // Return the PDF with proper headers
  return new NextResponse(pdfData, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
      "Content-Length": pdfData.byteLength.toString(),
    },
  });
}
