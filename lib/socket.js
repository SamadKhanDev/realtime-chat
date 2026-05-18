import { io } from "socket.io-client";

class SocketService {
  static instance = null;
  socket = null;
  offlineQueue = [];
  listeners = new Map();
  statusListeners = [];
  userId = null;

  static getInstance() {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(userId) {
    if (typeof window === "undefined") return null;
    
    this.userId = userId;

    if (this.socket?.connected) {
      // Re-trigger join event just in case
      this.socket.emit("join", userId);
      return this.socket;
    }

    if (this.socket) {
      this.socket.connect();
      return this.socket;
    }

    const url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";
    console.log("Connecting to socket server at URL:", url);

    this.socket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.setupLifecycleListeners(userId);
    this.loadOfflineQueue();
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.notifyStatusChange("disconnected");
    }
  }

  setupLifecycleListeners(userId) {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("WebSocket connected successfully:", this.socket.id);
      this.socket.emit("join", userId);
      this.notifyStatusChange("connected");
      this.flushOfflineQueue();
    });

    this.socket.on("disconnect", (reason) => {
      console.warn("WebSocket disconnected:", reason);
      if (reason === "io server disconnect") {
        // the disconnection was initiated by the server, you need to reconnect manually
        this.socket.connect();
      }
      this.notifyStatusChange("disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      this.notifyStatusChange("connecting");
    });

    this.socket.on("reconnect_attempt", () => {
      this.notifyStatusChange("reconnecting");
    });

    // Browser online/offline event handlers
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        console.log("Network online, reconnecting socket...");
        this.socket?.connect();
      });
      window.addEventListener("offline", () => {
        console.warn("Network offline!");
        this.notifyStatusChange("offline");
      });
    }
  }

  // Subscribe to connection status changes
  onStatusChange(callback) {
    this.statusListeners.push(callback);
    // Emit initial status if already initialized
    if (this.socket) {
      const status = typeof window !== "undefined" && !navigator.onLine 
        ? "offline" 
        : (this.socket.connected ? "connected" : "connecting");
      callback(status);
    } else {
      callback("disconnected");
    }
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  notifyStatusChange(status) {
    this.statusListeners.forEach(cb => cb(status));
  }

  // Safe subscription wrapper
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const filtered = this.listeners.get(event).filter(cb => cb !== callback);
    this.listeners.set(event, filtered);

    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Emit message with Acknowledgment (Ack) & Offline Queueing
  emitMessage(event, data, callback) {
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
    const isConnected = this.socket?.connected && isOnline;

    if (!isConnected) {
      console.warn("Socket disconnected or offline. Queueing message locally...", data);
      this.queueMessage(event, data, callback);
      if (callback) callback({ success: false, queued: true });
      return;
    }

    // Set a timeout for the acknowledgment response
    let acknowledged = false;
    const timeout = setTimeout(() => {
      if (!acknowledged) {
        console.warn(`Event ${event} timed out waiting for acknowledgment.`);
        this.queueMessage(event, data, callback);
        if (callback) callback({ success: false, error: "timeout", queued: true });
      }
    }, 6000);

    this.socket.emit(event, data, (response) => {
      acknowledged = true;
      clearTimeout(timeout);
      console.log(`Acknowledgment received for ${event}:`, response);
      if (callback) callback(response);
    });
  }

  queueMessage(event, data, callback) {
    // Generate a temporary ID if none exists for offline tracking
    if (!data.tempId && !data._id) {
      data.tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Avoid duplicate queueing
    if (this.offlineQueue.some(item => (item.data.tempId && item.data.tempId === data.tempId))) {
      return;
    }

    this.offlineQueue.push({ event, data, callback });
    this.saveOfflineQueue();
  }

  saveOfflineQueue() {
    if (typeof window !== "undefined") {
      localStorage.setItem("realchat_offline_queue", JSON.stringify(
        this.offlineQueue.map(item => ({ event: item.event, data: item.data }))
      ));
    }
  }

  loadOfflineQueue() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("realchat_offline_queue");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          this.offlineQueue = parsed.map(item => ({
            event: item.event,
            data: item.data,
            callback: null // callbacks cannot be fully restored from storage, but we retry sending
          }));
          console.log(`Restored ${this.offlineQueue.length} unsent offline messages.`);
        } catch (e) {
          console.error("Failed to parse offline queue", e);
        }
      }
    }
  }

  async flushOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    console.log(`Flushing ${this.offlineQueue.length} messages from offline queue...`);

    const queueToFlush = [...this.offlineQueue];
    this.offlineQueue = [];
    this.saveOfflineQueue();

    for (const item of queueToFlush) {
      if (item.event === "send-message") {
        try {
          const payload = item.data.groupId
            ? { groupId: item.data.groupId, text: item.data.text }
            : { receiverId: item.data.receiver, text: item.data.text };

          // Persist to server DB via Next.js REST API on network recovery
          const res = await fetch("/api/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();

          if (data.success) {
            console.log("Offline message persisted successfully to database on reconnect:", data.message);
            
            // Broadcast the persisted message real-time via isolated socket room
            const socketPayload = item.data.groupId
              ? { ...data.message, sender: this.userId, groupId: item.data.groupId }
              : { ...data.message, sender: this.userId, receiver: item.data.receiver };

            this.emitMessage("send-message", socketPayload, (ack) => {
              if (ack && ack.success) {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("message-resent", {
                    detail: {
                      tempId: item.data.tempId,
                      message: { ...data.message, status: ack.delivered ? "delivered" : "sent" }
                    }
                  }));
                }
              }
            });
            continue;
          }
        } catch (err) {
          console.warn("Reconnection REST API attempt failed. Keeping message in offline queue.", err);
        }
      }

      // Normal socket event fallback
      this.emitMessage(item.event, item.data, (res) => {
        if (res && res.success) {
          console.log("Successfully sent queued event post-reconnection:", item.data);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("message-resent", {
              detail: { tempId: item.data.tempId, message: res.message || item.data }
            }));
          }
        } else {
          this.queueMessage(item.event, item.data, item.callback);
        }
      });
    }
  }
}

export const socket = SocketService.getInstance();