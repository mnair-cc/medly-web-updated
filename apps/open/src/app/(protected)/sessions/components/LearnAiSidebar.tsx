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

interface LearnAiSidebarProps {
  socket: Socket | null;
  socketError: Error | null;
  setSocketError: (error: Error | null) => void;
  lessonData: LessonData;
  user: UserDetails;
  lessonId: string;
  refetchUser: () => Promise<void>;
}

const LearnAiSidebar: React.FC<LearnAiSidebarProps> = ({
  socket,
  socketError,
  setSocketError,
  lessonData,
  user,
  lessonId,
  refetchUser,
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
    handleFilterUserMessageAndSend,
    userInput,
    setUserInput,
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

  return (
    <div className="border-l border-[#F0F0F0] h-full overflow-hidden">
      <div className="flex flex-col justify-center flex-1 bg-white relative overflow-y-scroll h-full">
        <div className="flex justify-center items-center p-6">
          <p className="font-rounded-heavy text-[15px]">Ask medly</p>
        </div>

        <div className="overflow-y-auto flex-1 px-4" ref={chatContainerRef}>
          <ChatThread
            messages={messages}
            isAwaitingResponse={isAwaitingResponse}
            isLearnPage={true}
            options={options}
          />
        </div>

        <div className="p-4">
          {progress >= 1 ? (
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
