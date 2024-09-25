"use client";
import { useEffect, useState, useMemo } from "react";
import { io } from "socket.io-client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Constants for character limit and typing indicator delay
const MAX_CHARACTERS = 500;
const TYPING_TIMER_LENGTH = 2000; // 2 seconds

const Page = () => {
  // State variables for managing text, AI completion, and UI states
  const [text, setText] = useState("");
  const [aiCompletion, setAiCompletion] = useState("");
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [userCount, setUserCount] = useState(0);

  // Initialize socket connection (memoized to prevent unnecessary re-creation)
  const socket = useMemo(
    () =>
      io("http://localhost:4000", {
        transports: ["websocket"],
        upgrade: true,
      }),
    []
  );

  // Ref for managing typing indicator timeout (memoized to maintain reference across renders)
  const typingTimeoutRef = useMemo(
    () => ({ current: null as NodeJS.Timeout | null }),
    []
  );

  useEffect(() => {
    // Set up socket event listeners
    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("text-update", (updatedText: string) => {
      console.log("Received text update from server:", updatedText);
      setText(updatedText.slice(0, MAX_CHARACTERS)); // Ensure text doesn't exceed character limit
    });

    socket.on("user-typing", () => {
      setIsOtherUserTyping(true);
    });

    socket.on("user-stop-typing", () => {
      setIsOtherUserTyping(false);
    });

    socket.on("ai-completion", (completion: string) => {
      console.log("Received AI completion:", completion);
      setAiCompletion(completion);
      setIsGeneratingAI(false);
    });

    socket.on("ai-completion-error", (error: string) => {
      console.error("AI completion error:", error);
      setIsGeneratingAI(false);
      setAiCompletion("Error: Failed to generate AI completion");
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });

    socket.on("user-count", (count: number) => {
      setUserCount(count);
    });

    // Clean up event listeners on component unmount
    return () => {
      console.log("Disconnecting socket");
      socket.disconnect();
      socket.off("connect");
      socket.off("text-update");
      socket.off("user-typing");
      socket.off("user-stop-typing");
      socket.off("ai-completion");
      socket.off("ai-completion-error");
      socket.off("connect_error");
      socket.off("user-count");
    };
  }, [socket]);

  // Handle text changes in the textarea
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value.slice(0, MAX_CHARACTERS);
    setText(newText);
    console.log("Sending text update to server:", newText);
    socket.emit("text-update", newText);

    // Emit typing indicator and manage typing timeout
    socket.emit("typing");
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop-typing");
    }, TYPING_TIMER_LENGTH);
  };

  // Request AI completion from the server
  const handleAICompletion = () => {
    setIsGeneratingAI(true);
    setAiCompletion(""); // Clear previous completion
    socket.emit("request-ai-completion", text);
  };

  // Calculate character count and remaining characters
  const characterCount = text.length;
  const remainingCharacters = MAX_CHARACTERS - characterCount;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        Real-time Collaborative Story Starter
      </h1>
      <p className="text-sm text-gray-600 mb-4">
        Current number of users: {userCount}
      </p>
      <Textarea
        value={text}
        onChange={handleTextChange}
        placeholder="Start typing..."
        className="w-full h-40 mb-2"
        maxLength={MAX_CHARACTERS}
      />
      <div className="text-sm text-gray-500 mb-2">
        {characterCount} / {MAX_CHARACTERS} characters
        {remainingCharacters <= 50 && (
          <span className="ml-2 text-red-500">
            ({remainingCharacters} remaining)
          </span>
        )}
      </div>
      {isOtherUserTyping && (
        <div className="text-sm text-gray-400 italic mb-2">
          Other user is typing...
        </div>
      )}
      <Button
        onClick={handleAICompletion}
        disabled={isGeneratingAI}
        className="mb-4"
      >
        {isGeneratingAI ? "Generating..." : "AI Complete"}
      </Button>
      {(aiCompletion || isGeneratingAI) && (
        <div className="bg-gray-100 p-4 rounded-md mt-4">
          <h2 className="text-lg font-semibold mb-2">AI Completion:</h2>
          {isGeneratingAI ? <p>Generating...</p> : <p>{aiCompletion}</p>}
        </div>
      )}
    </div>
  );
};

export default Page;
