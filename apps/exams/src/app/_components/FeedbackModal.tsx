"use client";

import { useState, ReactNode } from "react";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedbackType: "positive" | "negative";
  questionData?: any[];
  conversationHistory?: any[];
  subject?: { legacyId: string };
  onTrackSignal?: (name: "thumbs_up" | "thumbs_down", comment?: string, questionId?: string) => Promise<void>;
}

const FeedbackModal = ({
  isOpen,
  onClose,
  feedbackType,
  questionData,
  conversationHistory,
  subject,
  onTrackSignal,
}: FeedbackModalProps) => {
  const { track } = useTracking();
  const [feedbackText, setFeedbackText] = useState("");
  const [issueType, setIssueType] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async () => {
    // Reset any previous error
    setError("");

    // Validate that at least one response is provided
    if (feedbackType === "positive" && !feedbackText.trim()) {
      setError("Please provide some feedback before submitting");
      console.error("Please provide some feedback before submitting");
      return;
    }

    if (feedbackType === "negative" && !issueType && !feedbackText.trim()) {
      setError(
        "Please provide either an issue type or feedback text before submitting"
      );
      console.error(
        "Please provide either an issue type or feedback text before submitting"
      );
      return;
    }

    // If we reach here, validation passed
    
    // Track with PostHog (existing behavior)
    track("feedback_provided", {
      subject_id: subject?.legacyId,
      feedback_type: feedbackType,
      feedback_text: feedbackText,
      issue_type: feedbackType === "negative" ? issueType : null,
      question_data: questionData,
      conversation_history: conversationHistory,
    });

    // Track with Raindrop (new behavior)
    if (onTrackSignal) {
      const signalName = feedbackType === "positive" ? "thumbs_up" : "thumbs_down";
      const comment = feedbackType === "negative" && issueType 
        ? `${issueType}: ${feedbackText}`.trim() 
        : feedbackText.trim();
      
      // Get question ID from questionData
      const questionId = questionData?.[0]?.legacyId;
      
      try {
        await onTrackSignal(signalName, comment, questionId);
      } catch (error) {
        console.error('Failed to track Raindrop signal:', error);
      }
    }

    toast.success("Feedback submitted", {
      duration: 3000,
    });

    setFeedbackText("");
    setIssueType("");

    onClose();
  };

  return (
    <div className="absolute inset-0 bg-black/50 flex justify-center items-center z-50">
      <div className="bg-white rounded-[16px] text-center shadow-[0_0_32px_rgba(0,0,0,0.2)] w-[90%] md:w-[60%] overflow-hidden relative flex flex-col p-4 pt-10 md:p-10 md:pb-5 max-h-[90%] overflow-y-scroll">
        <div className="absolute top-5 right-5">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="mb-5">
          <svg
            width="35"
            height="20"
            viewBox="0 0 35 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M30.1038 2.05101C28.8099 1.26646 22.6391 -2.84896 13.246 8.34152L11.5665 10.1293C11.5665 10.1293 3.5874 6.65031 0.885153 10.4341C-1.39144 13.6219 1.13812 16.9425 3.79415 16.9425C6.7307 16.9425 9.42301 14.5389 11.3799 12.4469L17.9862 17.1349C19.9767 18.5387 22.3032 19.3333 24.6794 19.3333C27.1179 19.3201 30.253 18.5785 32.3307 15.559C36.4255 9.37153 32.7577 3.66007 30.1038 2.05101ZM4.3069 12.9558C4.17661 12.2653 4.49444 11.7323 4.95493 11.4959C6.37222 10.7683 9.70037 11.8509 9.70037 11.8509C9.70037 11.8509 7.2985 13.8999 5.69703 14.026C5.04749 14.0771 4.46021 13.7682 4.3069 12.9558ZM27.4285 9.32167C27.0553 11.4406 25.3256 14.0321 18.4091 12.2482C14.1791 11.0564 13.0916 10.5338 13.0916 10.5338C13.0916 10.5338 17.7907 5.31027 21.6438 4.69964C26.3102 3.9601 27.8018 7.20277 27.4285 9.32167Z"
              fill="black"
            />
          </svg>
        </div>

        <h1 className="text-left text-3xl mb-2 font-rounded-bold mx-4 md:mx-0">
          Feedback
        </h1>

        <div className="text-left w-full">
          {feedbackType === "positive" ? (
            <>
              <p className="mb-3 text-sm">
                Please provide details: <span className="text-red-500">*</span>
              </p>
              <textarea
                className={`w-full p-3 border text-sm ${
                  error ? "border-red-500" : "border-gray-300"
                } rounded-md mb-2`}
                rows={5}
                placeholder="What was helpful about this question?"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
            </>
          ) : (
            <>
              <p className="mb-2 text-sm">
                What type of issue do you wish to report? (optional)
              </p>
              <select
                className={`w-full p-3 border text-sm ${
                  error ? "border-red-500" : "border-gray-300"
                } rounded-md mb-4`}
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
              >
                <option value="">Select an issue type</option>
                <option value="answer_marked_incorrectly">
                  My answer was marked incorrectly
                </option>
                <option value="ai_feedback_incorrect">
                  The AI feedback was incorrect or confusing
                </option>
                <option value="question_problem">
                  There's a problem with the question
                </option>
                <option value="technical_issue">
                  I experienced a technical issue
                </option>
              </select>

              <p className="mb-3 text-sm">
                Please provide any additional information: (optional)
              </p>
              <textarea
                className={`w-full p-3 border text-sm ${
                  error ? "border-red-500" : "border-gray-300"
                } rounded-md mb-4`}
                rows={5}
                placeholder="Please provide any additional information"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
            </>
          )}

          {/* {error && (
            <p className="text-red-500 mb-2 text-sm">{error}</p>
          )} */}

          <p className="text-[12px] text-gray-500 mb-4 italic">
            Submitting this report will send the entire current conversation to
            Medly for future improvements to our service. This will be
            anonymized and never be shared with anyone else.
          </p>

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 mr-2 rounded-full hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
