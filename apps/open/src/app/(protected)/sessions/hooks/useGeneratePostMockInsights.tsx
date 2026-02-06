import { useState, useEffect, useCallback, useRef } from "react";
import { Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/app/_context/UserProvider";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import { toast } from "sonner";
import { PostMockInsights, MockPage } from "@/app/(protected)/sessions/types";
import { curriculumApiV2Client } from "@/app/_lib/utils/axiosHelper";
import { queryKeys } from "@/app/_lib/query-keys";

export const useGeneratePostMockInsights = ({
  socket,
  socketError,
  pages,
  subjectId,
  paperId,
  onSuccess,
}: {
  socket: Socket | null;
  socketError: Error | null;
  pages: MockPage[];
  subjectId?: string;
  paperId?: string;
  onSuccess?: (insights: PostMockInsights) => void;
}) => {
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { track } = useTracking();

  useEffect(() => {
    if (!socket || socketError) return;

    const handleFinalResponse = async (data: any) => {
      //   console.log("post_mock_insights final_response", data);
      // Clear timeout since request completed successfully
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsAwaitingResponse(false);

      try {
        track("post_mock_insights_received", {
          response: data.response || data.message,
        });

        // Save insights to Firestore if subjectId and paperId are available
        if (subjectId && paperId && data) {
          try {
            await curriculumApiV2Client.post(`/papers/${paperId}/session`, {
              insightsOnly: true,
              initialInsights: data,
            });

            // Invalidate mock results cache
            queryClient.invalidateQueries({
              queryKey: queryKeys.mockResults,
            });

            console.log("Successfully saved insights to Firestore");
            // Call onSuccess callback with the insights data
            if (onSuccess) {
              onSuccess(data);
            }
          } catch (saveError) {
            console.error("Error saving insights:", saveError);
            toast.error("Failed to save insights");
          }
        }
      } catch (error) {
        console.error("Error handling final response:", error);
        toast.error("Failed to process insights");
      }
    };

    const handleError = (error: any) => {
      console.error("Socket error:", error);
      // Clear timeout since request failed
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsAwaitingResponse(false);
      toast.error("Connection error. Please try again.");
    };

    const handleTimeout = () => {
      console.warn("Socket timeout");
      // Clear timeout reference since timeout occurred
      timeoutRef.current = null;
      setIsAwaitingResponse(false);
      toast.error("Request timed out. Please try again.");
    };

    // Register socket event listeners
    socket.on("final_response_insights", handleFinalResponse);
    socket.on("error", handleError);
    socket.on("timeout", handleTimeout);

    return () => {
      // Clear any pending timeout when component unmounts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Remove socket listeners
      socket.off("final_response_insights", handleFinalResponse);
      socket.off("error", handleError);
      socket.off("timeout", handleTimeout);
    };
  }, [socket, socketError, track, subjectId, paperId, onSuccess, queryClient]);

  const generateInsights = useCallback(async () => {
    try {
      track("post_mock_insights_requested", {
        pages_count: pages?.length || 0,
      });

      if (!socket) {
        toast.error("Connection not available. Please try again.");
        return;
      }

      if (socketError) {
        toast.error("Connection error. Please refresh the page and try again.");
        return;
      }

      const data = {
        userName: user?.userName || "",
        isWeb: true,
        questionData: JSON.stringify(pages),
      };

      setIsAwaitingResponse(true);

      // Set timeout to prevent hanging requests
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setIsAwaitingResponse(false);
        toast.error("Request timed out. Please try again.");
      }, 30000); // 30 second timeout

      socket.emit("generatePostMockInsights", JSON.stringify(data));
    } catch (error) {
      console.error("Error generating insights:", error);
      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsAwaitingResponse(false);
      toast.error("Failed to generate insights. Please try again.");
    }
  }, [socket, socketError, pages, user?.userName, track]);

  return {
    isAwaitingResponse,
    generateInsights,
  };
};
