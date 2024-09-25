"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Import required modules
const express = require("express");
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
// Initialize Express app and create HTTP server
const app = express();
const server = (0, http_1.createServer)(app);
// Configure Socket.IO server with CORS settings
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:3000", // Allow connections from this origin
        methods: ["GET", "POST"], // Allow these HTTP methods
    },
});
// Initialize Anthropic API client
const anthropic = new sdk_1.default();
// Handle new socket connections
let userCount = 0;
io.on("connection", (socket) => {
    userCount++;
    io.emit("user-count", userCount);
    console.log("A user connected:", socket.id);
    // Handle text updates from clients
    socket.on("text-update", (text) => {
        console.log("Received text update from", socket.id, ":", text);
        io.emit("text-update", text); // Broadcast the update to all connected clients
        console.log("Broadcasted text update to all clients");
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
    socket.on("request-ai-completion", (currentText) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // Generate AI completion using Anthropic API
            const message = yield anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 300,
                temperature: 0.7,
                system: "You are a creative writing assistant. You will be given a short story and asked to continue it with 2-3 new sentences. Generate only the REST of the story with 2-3 new sentences.",
                messages: [
                    {
                        role: "user",
                        content: currentText,
                    },
                ],
            });
            const aiCompletion = message.content[0].text;
            console.log("Generated AI completion:", aiCompletion);
            io.emit("ai-completion", aiCompletion); // Broadcast AI completion to all clients
        }
        catch (error) {
            console.error("Error generating AI completion:", error);
            socket.emit("ai-completion-error", "Failed to generate AI completion"); // Notify the requesting client of the error
        }
    }));
    // Handle client disconnection
    socket.on("disconnect", () => {
        userCount--;
        io.emit("user-count", userCount);
        console.log("A user disconnected:", socket.id);
    });
});
// Start the server
const PORT = 4000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
