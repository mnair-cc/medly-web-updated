import { useState, useEffect, useRef } from "react";
import { Message, AiContext, LessonData } from "@/app/types/types";
import { Socket } from "socket.io-client";
import { lessonIdToSubjectId } from "@/app/_lib/utils/utils";
import { UserDetails } from "@/app/types/types";
import { useTracking } from "@/app/_lib/posthog/useTracking";
import { toast } from "sonner";

interface UseLearnAiProps {
  socket: Socket | null;
  socketError: Error | null;
  setSocketError: (error: Error | null) => void;
  lessonData: LessonData;
  user: UserDetails;
}

export const useLearnAi = ({
  socket,
  socketError,
  setSocketError,
  lessonData,
  user,
}: UseLearnAiProps) => {
  const { track } = useTracking();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [canReply, setCanReply] = useState(true);
  const [options, setOptions] = useState<string[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [summary, setSummary] = useState("");
  const [userInput, setUserInput] = useState("");
  const activeTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const canReplyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isCleared, setIsCleared] = useState(false);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!socket || socketError) return;

    socket.on("firstMessage", () => {
      // console.info("First message:", data);
    });

    socket.on("message", (data) => {
      if (lessonData) {
        track("lesson_message_received", {
          lesson_id: lessonData.legacyId,
          message: data,
        });
      }

      if (data && !isCleared) {
        // Clear any existing timeouts before starting new message stream
        activeTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
        activeTimeoutsRef.current = [];

        // Split the message into sentences using punctuation followed by space (ignoring decimals)
        const splitRegex = /(?<!\d)([.!?])\s+/g;
        const parts = data.split(splitRegex);
        const sentences: string[] = [];
        let current = "";

        // Combine split parts into complete sentences
        for (let i = 0; i < parts.length; i++) {
          if (i % 2 === 0) {
            current = parts[i];
          } else {
            current += parts[i];
            sentences.push(current.trim());
            current = "";
          }
        }
        if (current) {
          sentences.push(current.trim());
        }

        const lastIndex = sentences.length - 1;
        let cumulativeDelay = 0;

        sentences.forEach((message, index) => {
          if (index === 0) {
            setMessages((prev) => [...prev, { message, type: "apiMessage" }]);
            return;
          }

          // Calculate delay based on previous message length
          const charsPerMs = 20 / 1000;
          const prevMessageLength = sentences[index - 1].length;
          const messageDelay = Math.min(
            Math.max(prevMessageLength / charsPerMs, 1000),
            2500
          );

          cumulativeDelay += messageDelay;

          const timeout = setTimeout(() => {
            setMessages((prev) => [...prev, { message, type: "apiMessage" }]);
            if (index === lastIndex) {
              setIsAwaitingResponse(false);
            }
          }, cumulativeDelay);

          activeTimeoutsRef.current.push(timeout);
        });
      }
    });

    socket.on("options", (data) => {
      if (data.length > 0) {
        setOptions(data);
      }
    });

    socket.on("progress", (data) => {
      setProgress(data);
    });

    socket.on("summary", (data) => {
      setSummary(data);
    });

    socket.on("final_response", () => {
      setCanReply(true);
      // TODO: write to db here instead?
    });

    return () => {
      // Clear timeouts on cleanup
      activeTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      activeTimeoutsRef.current = [];
      
      // Clear canReply timeout
      if (canReplyTimeoutRef.current) {
        clearTimeout(canReplyTimeoutRef.current);
        canReplyTimeoutRef.current = null;
      }
      
      socket.off("firstMessage");
      socket.off("message");
      socket.off("options");
      socket.off("progress");
      socket.off("summary");
      socket.off("final_response");
    };
  }, [socket, socketError, isCleared]);

  const handleSendMessage = async (
    message: string,
    historyOverride?: Message[]
  ) => {
    track("lesson_message_sent", {
      lesson_id: lessonData.legacyId,
      message: message,
    });

    if (socket && socket.connected === false) {
      socket.disconnect();
      socket.connect();

      // Give the socket a moment to reconnect before proceeding
      const isConnected = await new Promise<boolean>((resolve) => {
        // Set a timeout in case connection takes too long
        const timeoutId = setTimeout(() => resolve(false), 3000);

        // Listen for successful connection
        socket.once("connect", () => {
          clearTimeout(timeoutId);
          setSocketError(null);
          resolve(true);
        });
      });

      if (!isConnected) {
        setIsAwaitingResponse(false);
        toast.error("Failed to connect to chat service. Please try again.");
        return;
      }
    }

    if (!socket || !lessonData || socketError) return;

    setIsCleared(false);
    activeTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    activeTimeoutsRef.current = [];
    
    // Clear any existing canReply timeout
    if (canReplyTimeoutRef.current) {
      clearTimeout(canReplyTimeoutRef.current);
      canReplyTimeoutRef.current = null;
    }
    
    setIsAwaitingResponse(true);
    setCanReply(false);
    
    // Set canReply to true after 3 seconds
    canReplyTimeoutRef.current = setTimeout(() => {
      setCanReply(true);
      canReplyTimeoutRef.current = null;
    }, 3000);

    const historyMessages = historyOverride ?? messagesRef.current;
    const data: AiContext = {
      question: message,
      history: historyMessages.map(
        (item) =>
          `${item.type === "apiMessage" ? "Medly" : "Student"}: ${item.message
          }<END_OF_TURN>`
      ),
      specification_point: { "Header 3": lessonData.legacyId },
      subject: lessonIdToSubjectId(lessonData.legacyId),
      progress: progress,
      lesson: lessonData.title,
      context: lessonData.textbookContent,
      report: `User name is ${user.userName}. Teaching guidance: ${""}`,
      previous_conversation: [],
    };

    socket.emit("messageV2", JSON.stringify(data));
  };

  const handleFilterUserMessageAndSend = async (message: string) => {
    setIsCleared(false);
    activeTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    activeTimeoutsRef.current = [];

    if (!message.trim()) return;

    setOptions([]);
    setUserInput("");
    const nextMessages = [
      ...messagesRef.current,
      { message, type: "userMessage" as const },
    ];
    messagesRef.current = nextMessages;
    setMessages(nextMessages);

    handleSendMessage(message, nextMessages);
  };

  const clearMessages = () => {
    setIsCleared(true);
    activeTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    activeTimeoutsRef.current = [];
    
    // Clear canReply timeout
    if (canReplyTimeoutRef.current) {
      clearTimeout(canReplyTimeoutRef.current);
      canReplyTimeoutRef.current = null;
    }
    
    setMessages([]);
    messagesRef.current = [];
    setIsAwaitingResponse(false);
    setCanReply(true);
    setUserInput("");
  };

  return {
    messages,
    setMessages,
    isAwaitingResponse,
    canReply,
    options,
    progress,
    summary,
    setProgress,
    setSummary,
    handleFilterUserMessageAndSend,
    handleSendMessage,
    userInput,
    setUserInput,
    clearMessages,
  };
};
