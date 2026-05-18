const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handler = app.getRequestHandler();

// Keep track of active users and their sockets for instant presence broadcast
const activeUsers = new Map(); // userId -> Set of socketIds

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    let currentUserId = null;
    console.log("User Connected:", socket.id);

    // Join personal user room and register online presence
    socket.on("join", (userId) => {
      currentUserId = userId;
      socket.join(userId);
      
      // Update active user mapping
      if (!activeUsers.has(userId)) {
        activeUsers.set(userId, new Set());
      }
      activeUsers.get(userId).add(socket.id);
      
      // Broadcast online status to all users
      io.emit("user-status-change", { userId, online: true });
      console.log(`User ${userId} is online. Connected devices: ${activeUsers.get(userId).size}`);

      // Send the newly joined client the list of all currently active/online user IDs
      const activeUserIds = Array.from(activeUsers.keys());
      socket.emit("initial-active-users", activeUserIds);
    });

    // Join a deterministic conversation room for two-party isolated security
    socket.on("join-conversation", ({ currentId, recipientId }, ack) => {
      const roomName = `room:${[currentId, recipientId].sort().join("-")}`;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined conversation room: ${roomName}`);
      if (ack) ack({ success: true, room: roomName });
    });

    // Leave conversation room (e.g. when exiting chat box or switching chat partner)
    socket.on("leave-conversation", ({ currentId, recipientId }, ack) => {
      const roomName = `room:${[currentId, recipientId].sort().join("-")}`;
      socket.leave(roomName);
      console.log(`Socket ${socket.id} left conversation room: ${roomName}`);
      if (ack) ack({ success: true });
    });

    // Join a group chat room
    socket.on("join-group", ({ groupId }, ack) => {
      const roomName = `group:${groupId}`;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined group room: ${roomName}`);
      if (ack) ack({ success: true, room: roomName });
    });

    // Leave a group chat room
    socket.on("leave-group", ({ groupId }, ack) => {
      const roomName = `group:${groupId}`;
      socket.leave(roomName);
      console.log(`Socket ${socket.id} left group room: ${roomName}`);
      if (ack) ack({ success: true });
    });

    // Send Message inside a scoped room with Delivery Acknowledgment Callback
    socket.on("send-message", (data, ack) => {
      let delivered = false;

      if (data.groupId) {
        const roomName = `group:${data.groupId}`;
        
        // Broadcast strictly inside the group room
        socket.to(roomName).emit("receive-message", data);
        
        // Check if any other members of the group are currently active/online
        if (data.members && Array.isArray(data.members)) {
          delivered = data.members.some(
            (memberId) => memberId !== data.sender && activeUsers.has(memberId)
          );
        }

        // Broadcast notifications to other group members in their personal user rooms
        // so they get unread counts/chimes if they aren't actively focused on this group chat
        if (data.members && Array.isArray(data.members)) {
          data.members.forEach((memberId) => {
            if (memberId !== data.sender) {
              socket.to(memberId).emit("new-message-notification", {
                ...data,
                text: `[Group Chat] ${data.text || "📷 Attachment"}`
              });
            }
          });
        }
        
        console.log(`Message broadcasted inside group ${roomName}`);
      } else {
        const roomName = `room:${[data.sender, data.receiver].sort().join("-")}`;
        
        // Broadcast message strictly inside the room
        socket.to(roomName).emit("receive-message", data);
        
        // Check if the recipient is currently online (has active socket connected)
        if (data.receiver && activeUsers.has(data.receiver)) {
          delivered = true;
        }

        // Also send a direct broadcast to the receiver's personal user room
        // in case they are logged in but not currently in the same active conversation tab (enables badge notification alerts)
        socket.to(data.receiver).emit("new-message-notification", data);

        console.log(`Message broadcasted from ${data.sender} to ${data.receiver} via room ${roomName}`);
      }

      // Respond back immediately with success acknowledgment & delivery status
      if (ack) {
        ack({
          success: true,
          delivered: delivered,
          message: data
        });
      }
    });

    socket.on("typing", (data, ack) => {
      const roomName = data.groupId ? `group:${data.groupId}` : `room:${[data.sender, data.receiver].sort().join("-")}`;
      socket.to(roomName).emit("typing", data);
      if (ack) ack({ success: true });
    });

    socket.on("disconnect", () => {
      console.log("Disconnected socket:", socket.id);
      if (currentUserId && activeUsers.has(currentUserId)) {
        const sockets = activeUsers.get(currentUserId);
        sockets.delete(socket.id);
        
        if (sockets.size === 0) {
          activeUsers.delete(currentUserId);
          // Broadcast presence update (offline)
          io.emit("user-status-change", { userId: currentUserId, online: false });
          console.log(`User ${currentUserId} went offline`);
        }
      }
    });
  });

  httpServer.listen(3000, () => {
    console.log("Server running on port 3000");
  });
});