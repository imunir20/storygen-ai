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
        origin: "http://localhost:4000", // Allow connections from this origin
        methods: ["GET", "POST"], // Allow these HTTP methods
    },
});
// Initialize Anthropic API client
const anthropic = new sdk_1.default({
    apiKey: "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",
});
// Handle new socket connections
let userCount = 0;
let ids = [];
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
    socket.on("request-ai-completion", (currentText) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // Generate AI completion using Anthropic API
            const message = yield anthropic.messages.create({
                model: "claude-3-sonnet-20240229",
                max_tokens: 300,
                temperature: 0.7,
                system: "You are a funny and creative story writer. You will be given a short story and asked to continue it with 2-3 new sentences. You should output nothing but the REST of the story starting with the next sentence.",
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
