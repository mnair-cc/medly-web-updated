"use client";

import ChatThread from "@/app/(protected)/sessions/components/ChatThread";
import InputBar from "@/app/(protected)/sessions/components/InputBar";
import LessonCompleteModal from "@/app/(protected)/sessions/components/LessonCompleteModal";
import MessageSuggestions from "@/app/(protected)/sessions/components/MessageSuggestions";
import { useChat } from "@/app/_hooks/useChat";
import { useLearnAi } from "@/app/_hooks/useLearnAi";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import { curriculumApiV2Client } from "@/app/_lib/utils/axiosHelper";
import { LessonData, UserDetails } from "@/app/types/types";
import React, { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import Link from "next/link";
import PrimaryButtonClicky from "@/app/_components/PrimaryButtonClicky";

interface LearnAiSidebarProps {
  socket: Socket | null;
  socketError: Error | null;
  setSocketError: (error: Error | null) => void;
  lessonData: LessonData;
  user: UserDetails;
  lessonId: string;
  refetchUser: () => Promise<void>;
  /** Show premium upgrade prompt instead of chat input */
  showPremiumPrompt?: boolean;
  /** Theme color for user messages */
  userMessageColor?: string;
}

const LearnAiSidebar: React.FC<LearnAiSidebarProps> = ({
  socket,
  socketError,
  setSocketError,
  lessonData,
  user,
  lessonId,
  refetchUser,
  showPremiumPrompt = false,
  userMessageColor,
}) => {
  const { track } = useTracking();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastSavedProgressRef = useRef<number>(0);
  const hasInitializedRef = useRef(false);
  const { data: chatData, isLoading: chatDataLoading } = useChat(lessonId);

  const {
    summary,
    messages,
    setMessages,
    isAwaitingResponse,
    canReply,
    options,
    progress,
    setProgress,
    setSummary,
    handleFilterUserMessageAndSend,
    userInput,
    setUserInput,
    clearMessages,
  } = useLearnAi({
    socket,
    socketError,
    setSocketError,
    lessonData,
    user,
  });

  useEffect(() => {
    if (chatDataLoading) return;

    // Only sync from server on initial load.
    // After initial load, local state is source of truth to avoid stale refetch data
    // overwriting user progress due to replication lag.
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (!chatData?.messages || chatData.messages.length === 0) return;

    // Avoid overwriting local messages if user already interacted before server data arrived.
    // Use callback form to check current state without adding `messages` to deps.
    setMessages((prevMessages) => {
      if (prevMessages.length > 0) return prevMessages;
      return chatData.messages;
    });
    setProgress((prevProgress) => {
      if (prevProgress > 0) return prevProgress;
      lastSavedProgressRef.current = chatData.progress;
      return chatData.progress;
    });
  }, [chatData, chatDataLoading, setMessages, setProgress]);

  useEffect(() => {
    const saveMessages = async () => {
      if (messages.length > 0) {
        try {
          const previousProgress = lastSavedProgressRef.current;
          await curriculumApiV2Client.put(`/lessons/${lessonId}/chat`, {
            messages,
            progress,
            summary,
          });

          // Update ref after successful save
          lastSavedProgressRef.current = progress;

          // If lesson was just completed (progress reached 1), refresh user data for feature usage
          if (progress >= 1 && previousProgress < 1) {
            await refetchUser();
          }
        } catch (error) {
          console.error("Failed to save chat messages:", error);
        }
      }
    };

    saveMessages();
  }, [messages, progress, summary, lessonId, refetchUser]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, options]);

  const handleReset = async () => {
    clearMessages();
    setProgress(0);
    setSummary("");
    lastSavedProgressRef.current = 0;
    try {
      await curriculumApiV2Client.put(`/lessons/${lessonId}/chat`, {
        messages: [],
        progress: 0,
        summary: "",
      });
    } catch (error) {
      console.error("Failed to clear chat messages:", error);
    }
  };

  return (
    <div className="border-l border-[#F0F0F0] h-full overflow-hidden">
      <div className="flex flex-col justify-center flex-1 bg-white relative overflow-y-scroll h-full">
        <div className="flex justify-center items-center p-6 relative">
          <p className="font-rounded-heavy text-[15px]">Ask medly</p>
          {messages.length > 0 && (
            <button
              type="button"
              aria-label="Reset chat"
              className="absolute right-6 top-1/2 -translate-y-1/2 text-[14px] font-rounded-semibold text-black/60 hover:text-black flex items-center gap-1"
              onClick={handleReset}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M14.2549 12.0986C14.7295 12.0986 15.1074 11.7207 15.1074 11.2373C15.1074 11 15.0195 10.8066 14.8613 10.6484L12.4707 8.27539C12.9277 8.19629 13.4551 8.15234 14.0264 8.15234C17.4102 8.15234 20.1084 10.8594 20.1084 14.2783C20.1084 17.6709 17.3926 20.3955 14 20.3955C10.6162 20.3955 7.8916 17.6709 7.8916 14.2783C7.8916 13.751 7.54883 13.373 7.03906 13.373C6.51172 13.373 6.14258 13.751 6.14258 14.2783C6.14258 18.6377 9.64941 22.1445 14 22.1445C18.3594 22.1445 21.8574 18.6377 21.8574 14.2783C21.8574 9.91895 18.377 6.43848 14.0264 6.43848C13.6133 6.43848 13.1914 6.47363 12.7695 6.53516L14.8701 4.47852C15.0195 4.31152 15.1074 4.11816 15.1074 3.88086C15.1074 3.39746 14.7383 3.00195 14.2549 3.00195C14 3.00195 13.7979 3.08984 13.6396 3.26562L10.0361 6.93066C9.85156 7.10645 9.76367 7.33496 9.76367 7.57227C9.76367 7.81836 9.84277 8.0293 10.0361 8.22266L13.6484 11.8525C13.7979 12.0195 14 12.0986 14.2549 12.0986Z"
                  fill="#1C1C1E"
                />
              </svg>
              Reset
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-4" ref={chatContainerRef}>
          <ChatThread
            messages={messages}
            isAwaitingResponse={isAwaitingResponse}
            isLearnPage={true}
            options={options}
            userMessageColor={userMessageColor}
          />
        </div>

        <div className="p-4">
          {showPremiumPrompt ? (
            <div className="flex items-center justify-center">
              <div className="w-full max-w-sm bg-white rounded-[16px] border border-[#E9E9F0] p-6 shadow-lg">
                <div className="w-full font-rounded-heavy text-black mb-2 text-2xl text-center">
                  Upgrade to Medly Pro
                </div>
                <div className="text-gray-500 mb-5 text-center text-sm">
                  Chat with Medly to get step-by-step explanations and
                  strategies for improving your speed.
                </div>

                <Link href="/plan" className="w-full">
                  <PrimaryButtonClicky
                    buttonText="Upgrade now"
                    buttonState="filled"
                    doesStretch={true}
                    showKeyboardShortcut={false}
                  />
                </Link>
              </div>
            </div>
          ) : progress >= 1 ? (
            <LessonCompleteModal legacyId={lessonId} />
          ) : (
            <>
              {messages.length === 0 && !isAwaitingResponse && (
                <MessageSuggestions
                  suggestions={[
                    "Teach me this lesson",
                    "I have a question about this lesson",
                    "Can you explain this concept?",
                  ]}
                  onSuggestionClick={(message) => {
                    track("clicked_message_suggestion", {
                      message_suggestion: message,
                    });
                    handleFilterUserMessageAndSend(message);
                  }}
                />
              )}
              <div className="mt-3">
                <InputBar
                  userInput={userInput}
                  setUserInput={setUserInput}
                  handleFilterUserMessageAndSend={
                    handleFilterUserMessageAndSend
                  }
                  canReply={canReply}
                  options={options}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearnAiSidebar;
