// Import required modules
const express = require("express");
import { Server } from "socket.io";
import { createServer } from "http";
import Anthropic from "@anthropic-ai/sdk";

// Initialize Express app and create HTTP server
const app = express();
const server = createServer(app);

// Configure Socket.IO server with CORS settings
const io = new Server(server, {
  cors: {
    origin: "http://localhost:4000", // Allow connections from this origin
    methods: ["GET", "POST"], // Allow these HTTP methods
  },
});

// Initialize Anthropic API client
const anthropic = new Anthropic({
  apiKey: "",
});

// Handle new socket connections
let userCount = 0;
let ids: number[] = [];

io.on("connection", (socket) => {
  console.log("Aaaaa user connected:", socket.id);
  console.log("User count before increment:", userCount);
  userCount++;
  console.log("User count after increment:", userCount);
  io.emit("user-count", userCount);
  console.log("Emitted increased users:", userCount);

  // Handle text updates from clients
  socket.on("text-update", (text) => {
    console.log("Received text update from", socket.id, ":", text);
    io.emit("text-update", text); // Broadcast the update to all connected clients
    console.log("Broadcasted text update to all clients");
  });

  socket.on("id", (id) => {
    console.log("Received id from", socket.id, ":", id);
    if (!ids.includes(id)) {
      ids.push(id);
      userCount++;
    }
    console.log("Broadcasted id to all clients");
  });

  // Handle typing indicator
  socket.on("typing", () => {
    socket.broadcast.emit("user-typing", socket.id); // Notify other clients that this user is typing
  });

  // Handle stop typing indicator
  socket.on("stop-typing", () => {
    socket.broadcast.emit("user-stop-typing", socket.id); // Notify other clients that this user stopped typing
  });

  // Handle AI completion requests
  socket.on("request-ai-completion", async (currentText) => {
    try {
      // Generate AI completion using Anthropic API
      const message = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229",
        max_tokens: 300,
        temperature: 0.7,
        system:
          "You are a funny and creative story writer. You will be given a short story and asked to continue it with 2-3 new sentences. You should output nothing but the REST of the story starting with the next sentence.",
        messages: [
          {
            role: "user",
            content: currentText,
          },
        ],
      });

      const aiCompletion = (message.content[0] as Anthropic.TextBlock).text;
      console.log("Generated AI completion:", aiCompletion);
      io.emit("ai-completion", aiCompletion); // Broadcast AI completion to all clients
    } catch (error) {
      console.error("Error generating AI completion:", error);
      socket.emit("ai-completion-error", "Failed to generate AI completion"); // Notify the requesting client of the error
    }
  });

  // Handle client disconnection
  socket.on("disconnect", (socket_id) => {
    console.log("A user disconnected:", socket.id);
    console.log("User count before decrement:", userCount);
    userCount--;

    console.log("User count after decrement:", userCount);
    io.emit("user-count", userCount);
    console.log("Emitted decreased users:", userCount);
  });
});

// Start the server
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log("User count before server start:", userCount);
});
