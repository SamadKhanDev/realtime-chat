"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ChatBox from "@/components/ChatBox";

export default function ChatDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);

  // Connection, Notification, and Group states
  const [connectionStatus, setConnectionStatus] = useState("connected");
  const [notifications, setNotifications] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Create Group Modal states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupAvatar, setGroupAvatar] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  // Typing states
  const [recipientTyping, setRecipientTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Track previous selections for clean room exits
  const prevSelectedUserRef = useRef(null);
  const prevSelectedGroupRef = useRef(null);

  const router = useRouter();

  // 1. Authenticate user and fetch users & groups on mount
  useEffect(() => {
    const authenticate = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.status === 401) {
          router.push("/login");
          return;
        }

        const data = await res.json();
        if (data.success) {
          setCurrentUser(data.user);

          // Connect singleton socket service
          socket.connect(data.user._id);

          // Fetch other users
          const usersRes = await fetch("/api/users");
          const usersData = await usersRes.json();
          if (usersData.success) {
            setUsers(usersData.users);
          }

          // Fetch groups
          const groupsRes = await fetch("/api/groups");
          const groupsData = await groupsRes.json();
          if (groupsData.success) {
            setGroups(groupsData.groups);
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    authenticate();
  }, [router]);

  // 2. Track connection status
  useEffect(() => {
    const unsubscribe = socket.onStatusChange((status) => {
      setConnectionStatus(status);
    });
    return () => unsubscribe();
  }, []);

  // 3. Listen to offline message background re-send success events
  useEffect(() => {
    const handleMessageResent = (e) => {
      const { tempId, message } = e.detail;
      setMessages((prev) =>
        prev.map((msg) => (msg._id === tempId ? { ...message, status: "delivered" } : msg))
      );
      fetchUsersList();
      fetchGroupsList();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("message-resent", handleMessageResent);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("message-resent", handleMessageResent);
      }
    };
  }, []);

  // 4. Scoped Conversation Room Management (Direct Chats)
  useEffect(() => {
    if (!currentUser) return;

    if (selectedUser) {
      // Leave previous conversation room if any
      if (prevSelectedUserRef.current && prevSelectedUserRef.current._id !== selectedUser._id) {
        socket.emitMessage("leave-conversation", {
          currentId: currentUser._id,
          recipientId: prevSelectedUserRef.current._id
        });
      }

      // Join new conversation room
      socket.emitMessage("join-conversation", {
        currentId: currentUser._id,
        recipientId: selectedUser._id
      });

      // Clear notifications for the selected user
      setNotifications((prev) => prev.filter((n) => n.sender !== selectedUser._id));

      prevSelectedUserRef.current = selectedUser;
    } else if (prevSelectedUserRef.current) {
      // Leave conversation room when deselected
      socket.emitMessage("leave-conversation", {
        currentId: currentUser._id,
        recipientId: prevSelectedUserRef.current._id
      });
      prevSelectedUserRef.current = null;
    }
  }, [selectedUser, currentUser]);

  // 5. Scoped Group Room Management
  useEffect(() => {
    if (!currentUser) return;

    if (selectedGroup) {
      // Leave previous group room if any
      if (prevSelectedGroupRef.current && prevSelectedGroupRef.current._id !== selectedGroup._id) {
        socket.emitMessage("leave-group", { groupId: prevSelectedGroupRef.current._id });
      }

      // Join new group room
      socket.emitMessage("join-group", { groupId: selectedGroup._id });

      // Clear notifications for the selected group
      setNotifications((prev) => prev.filter((n) => n.groupId !== selectedGroup._id));

      prevSelectedGroupRef.current = selectedGroup;
    } else if (prevSelectedGroupRef.current) {
      // Leave group room when deselected
      socket.emitMessage("leave-group", { groupId: prevSelectedGroupRef.current._id });
      prevSelectedGroupRef.current = null;
    }
  }, [selectedGroup, currentUser]);

  // 6. Manage Socket.io listeners
  useEffect(() => {
    if (!currentUser) return;

    const handleReceiveMessage = (data) => {
      const isCurrentGroup = selectedGroup && data.groupId === selectedGroup._id;
      const isCurrentUser = selectedUser && data.sender === selectedUser._id && !data.groupId;

      if (isCurrentGroup || isCurrentUser) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === data._id || (m.tempId && m.tempId === data.tempId))) {
            return prev;
          }
          return [...prev, { ...data, status: "delivered" }];
        });
      } else {
        fetchUsersList();
        fetchGroupsList();
      }
    };

    const handleNewMessageNotification = (data) => {
      const isCurrentGroup = selectedGroup && data.groupId === selectedGroup._id;
      const isCurrentUser = selectedUser && data.sender === selectedUser._id && !data.groupId;

      if (!isCurrentGroup && !isCurrentUser) {
        setNotifications((prev) => {
          if (prev.some((n) => n._id === data._id)) return prev;
          return [data, ...prev];
        });

        // Play premium audio chime
        try {
          const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav");
          audio.volume = 0.2;
          audio.play().catch(() => { });
        } catch (e) { }

        fetchUsersList();
        fetchGroupsList();
      }
    };

    const handleUserStatusChange = ({ userId, online }) => {
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u._id === userId ? { ...u, online } : u))
      );
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, online } : null));
      }
    };

    const handleInitialActiveUsers = (activeUserIds) => {
      setUsers((prevUsers) =>
        prevUsers.map((u) => ({
          ...u,
          online: activeUserIds.includes(u._id)
        }))
      );
    };

    const handleTyping = (data) => {
      const isCurrentGroup = selectedGroup && data.groupId === selectedGroup._id;
      const isCurrentUser = selectedUser && data.sender === selectedUser._id && !data.groupId;

      if (isCurrentGroup || isCurrentUser) {
        setRecipientTyping(true);

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setRecipientTyping(false);
        }, 3500);
      }
    };

    const handleConnect = () => {
      if (selectedUser) {
        socket.emitMessage("join-conversation", {
          currentId: currentUser._id,
          recipientId: selectedUser._id
        });
      } else if (selectedGroup) {
        socket.emitMessage("join-group", {
          groupId: selectedGroup._id
        });
      }
    };

    socket.on("receive-message", handleReceiveMessage);
    socket.on("new-message-notification", handleNewMessageNotification);
    socket.on("user-status-change", handleUserStatusChange);
    socket.on("initial-active-users", handleInitialActiveUsers);
    socket.on("typing", handleTyping);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
      socket.off("new-message-notification", handleNewMessageNotification);
      socket.off("user-status-change", handleUserStatusChange);
      socket.off("initial-active-users", handleInitialActiveUsers);
      socket.off("typing", handleTyping);
      socket.off("connect", handleConnect);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [currentUser, selectedUser, selectedGroup]);

  // Helpers to fetch sidebar entities
  const fetchUsersList = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGroupsList = async () => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (data.success) {
        setGroups(data.groups);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 7. Fetch messages when selected user changes (Direct Chat)
  useEffect(() => {
    if (!selectedUser) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?receiverId=${selectedUser._id}`);
        const data = await res.json();
        if (data.success) {
          const loaded = data.messages.map((m) => ({ ...m, status: "delivered" }));
          setMessages(loaded);
        }
      } catch (err) {
        console.error("Failed to load message history:", err);
      }
    };

    fetchMessages();
    setRecipientTyping(false);
  }, [selectedUser]);

  // 8. Fetch messages when selected group changes (Group Chat)
  useEffect(() => {
    if (!selectedGroup) return;

    const fetchGroupMessages = async () => {
      try {
        const res = await fetch(`/api/messages?groupId=${selectedGroup._id}`);
        const data = await res.json();
        if (data.success) {
          const loaded = data.messages.map((m) => ({ ...m, status: "delivered" }));
          setMessages(loaded);
        }
      } catch (err) {
        console.error("Failed to load group history:", err);
      }
    };

    fetchGroupMessages();
    setRecipientTyping(false);
  }, [selectedGroup]);

  // 9. Send Message Handler with Offline Resilience & Acknowledgement
  const handleSendMessage = async () => {
    if (!messageText.trim() || (!selectedUser && !selectedGroup)) return;

    const text = messageText;
    setMessageText("");

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempMessage = {
      _id: tempId,
      tempId: tempId,
      sender: currentUser._id,
      receiver: selectedUser ? selectedUser._id : null,
      groupId: selectedGroup ? selectedGroup._id : null,
      text,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    // Append locally immediately for instantaneous UI feedback
    setMessages((prev) => [...prev, tempMessage]);

    try {
      const payload = selectedGroup
        ? { groupId: selectedGroup._id, text }
        : { receiverId: selectedUser._id, text };

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === tempId ? { ...data.message, status: "pending" } : msg))
        );

        // Emit through isolated socket room with acknowledgment callback
        const socketPayload = selectedGroup
          ? { ...data.message, sender: currentUser._id, groupId: selectedGroup._id, members: selectedGroup.members }
          : { ...data.message, sender: currentUser._id, receiver: selectedUser._id };

        socket.emitMessage("send-message", socketPayload, (ack) => {
          console.log("Real-time message delivered successfully:", ack);
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === data.message._id || msg.tempId === tempId
                ? { ...msg, status: "delivered" }
                : msg
            )
          );
        });
      } else {
        socket.emitMessage("send-message", tempMessage, (ack) => {
          if (ack && ack.success) {
            setMessages((prev) =>
              prev.map((msg) => (msg._id === tempId ? { ...ack.message, status: "delivered" } : msg))
            );
          } else {
            setMessages((prev) =>
              prev.map((msg) => (msg._id === tempId ? { ...msg, status: "failed" } : msg))
            );
          }
        });
      }
    } catch (err) {
      console.warn("API offline. Storing in offline socket queue...");
      socket.emitMessage("send-message", tempMessage, (ack) => {
        if (ack && ack.success) {
          setMessages((prev) =>
            prev.map((msg) => (msg._id === tempId ? { ...ack.message, status: "delivered" } : msg))
          );
        } else {
          setMessages((prev) =>
            prev.map((msg) => (msg._id === tempId ? { ...msg, status: "failed" } : msg))
          );
        }
      });
    }
  };

  // 10. Send Rich Media Attachment Handler
  const handleSendAttachment = async (url) => {
    if (!selectedUser && !selectedGroup) return;

    const isImage = url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || url.startsWith("data:image");
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempMessage = {
      _id: tempId,
      tempId: tempId,
      sender: currentUser._id,
      receiver: selectedUser ? selectedUser._id : null,
      groupId: selectedGroup ? selectedGroup._id : null,
      image: isImage ? url : undefined,
      file: !isImage ? url : undefined,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const messageBody = selectedGroup
        ? { groupId: selectedGroup._id, image: isImage ? url : undefined, file: !isImage ? url : undefined }
        : { receiverId: selectedUser._id, image: isImage ? url : undefined, file: !isImage ? url : undefined };

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageBody),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === tempId ? { ...data.message, status: "pending" } : msg))
        );

        const socketPayload = selectedGroup
          ? { ...data.message, sender: currentUser._id, groupId: selectedGroup._id, members: selectedGroup.members }
          : { ...data.message, sender: currentUser._id, receiver: selectedUser._id };

        socket.emitMessage("send-message", socketPayload, (ack) => {
          console.log("Real-time attachment delivered successfully:", ack);
          setMessages((prev) =>
            prev.map((msg) =>
              msg._id === data.message._id || msg.tempId === tempId
                ? { ...msg, status: "delivered" }
                : msg
            )
          );
        });
      } else {
        socket.emitMessage("send-message", tempMessage, (ack) => {
          if (ack && ack.success) {
            setMessages((prev) =>
              prev.map((msg) => (msg._id === tempId ? { ...ack.message, status: "delivered" } : msg))
            );
          } else {
            setMessages((prev) =>
              prev.map((msg) => (msg._id === tempId ? { ...msg, status: "failed" } : msg))
            );
          }
        });
      }
    } catch (err) {
      console.warn("Attachment API failed. Queueing in socket...");
      socket.emitMessage("send-message", tempMessage, (ack) => {
        if (ack && ack.success) {
          setMessages((prev) =>
            prev.map((msg) => (msg._id === tempId ? { ...ack.message, status: "delivered" } : msg))
          );
        } else {
          setMessages((prev) =>
            prev.map((msg) => (msg._id === tempId ? { ...msg, status: "failed" } : msg))
          );
        }
      });
    }
  };

  // 11. Trigger Client-side Typing Event
  const handleTypingEvent = () => {
    if (!currentUser) return;
    if (selectedGroup) {
      socket.emitMessage("typing", {
        sender: currentUser._id,
        groupId: selectedGroup._id,
      });
    } else if (selectedUser) {
      socket.emitMessage("typing", {
        sender: currentUser._id,
        receiver: selectedUser._id,
      });
    }
  };

  // 12. Mutual Selection Wrappers
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSelectedGroup(null);
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
  };

  // 13. Logout Handler
  const handleLogout = async () => {
    try {
      socket.disconnect();
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout request failed:", err);
    }
  };

  const handleToggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroupSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName,
          members: selectedMembers,
          avatar: groupAvatar || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGroupName("");
        setGroupAvatar("");
        setSelectedMembers([]);
        setShowCreateGroupModal(false);
        fetchGroupsList();
      }
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center flex-col gap-4 font-sans">
        <svg className="animate-spin h-10 w-10 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-semibold tracking-wide text-neutral-400">Loading RealChat app...</span>
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral-950 flex flex-col overflow-hidden text-white font-sans">
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        notifications={notifications}
        setNotifications={setNotifications}
        onSelectUser={handleSelectUser}
        onSelectGroup={handleSelectGroup}
        users={users}
        groups={groups}
      />

      {/* Premium Connection Status Banner */}
      {connectionStatus !== "connected" && (
        <div
          className={`w-full py-2 px-6 flex items-center justify-center gap-3 transition-all duration-300 z-30 border-b backdrop-blur-md ${connectionStatus === "offline"
              ? "bg-amber-500/10 border-amber-500/20 text-amber-300 shadow-md shadow-amber-500/5 animate-pulse"
              : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300 shadow-md shadow-indigo-500/5"
            }`}
        >
          {connectionStatus === "offline" ? (
            <>
              <svg className="w-4 h-4 shrink-0 animate-bounce text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-xs font-semibold tracking-wide">
                Network connection lost. You are offline. Unsent messages will be queued and sent automatically upon reconnect.
              </span>
            </>
          ) : (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs font-semibold tracking-wide">
                {connectionStatus === "reconnecting" ? "Attempting to reconnect to chat server..." : "Connecting to chat server..."}
              </span>
            </>
          )}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          users={users}
          selectedUser={selectedUser}
          onSelectUser={handleSelectUser}
          groups={groups}
          selectedGroup={selectedGroup}
          onSelectGroup={handleSelectGroup}
          onCreateGroupClick={() => setShowCreateGroupModal(true)}
        />
        <ChatBox
          selectedUser={selectedUser}
          selectedGroup={selectedGroup}
          currentUser={currentUser}
          messages={messages}
          messageText={messageText}
          setMessageText={setMessageText}
          onSendMessage={handleSendMessage}
          onSendAttachment={handleSendAttachment}
          onTyping={handleTypingEvent}
          recipientTyping={recipientTyping}
          users={users}
        />
      </div>

      {/* Viewport-level Glassmorphic Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-neutral-950/20">
              <h3 className="text-base font-bold text-white tracking-wide">Create New Group</h3>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="text-neutral-400 hover:text-white transition duration-200 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Project Alpha"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/10 focus:border-indigo-500 outline-none text-sm transition duration-200 text-white"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Group Avatar URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://example.com/avatar.png"
                  value={groupAvatar}
                  onChange={(e) => setGroupAvatar(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/10 focus:border-indigo-500 outline-none text-sm transition duration-200 text-white"
                />
              </div>

              <div className="flex flex-col gap-1.5 flex-1 min-h-[150px]">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Add Members</label>
                <div className="flex-1 overflow-y-auto divide-y divide-white/5 border border-white/10 rounded-xl bg-neutral-950/60 custom-scrollbar max-h-48">
                  {users.length === 0 ? (
                    <div className="p-4 text-center text-xs text-neutral-500">No other users to add</div>
                  ) : (
                    users.map((user) => (
                      <div
                        key={user._id}
                        onClick={() => handleToggleMember(user._id)}
                        className="p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition duration-150"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-neutral-950 shrink-0">
                            <img
                              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366F1&color=fff`}
                              alt={user.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-white">{user.name}</span>
                            <span className="text-[10px] text-neutral-400">{user.email}</span>
                          </div>
                        </div>

                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition duration-200 ${selectedMembers.includes(user._id)
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "border-white/20 text-transparent"
                          }`}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-2 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-neutral-300 font-semibold text-xs transition duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/10 transition duration-205 cursor-pointer"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}