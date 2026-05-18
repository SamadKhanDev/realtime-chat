import { useEffect, useRef, useState } from "react";
import Message from "./Message";

export default function ChatBox({
  selectedUser,
  selectedGroup,
  currentUser,
  messages,
  messageText,
  setMessageText,
  onSendMessage,
  onSendAttachment,
  onTyping,
  recipientTyping,
  users = []
}) {
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // Auto scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, recipientTyping]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    onTyping(); // Trigger typing notifications to server
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        onSendAttachment(data.url);
      } else {
        alert(data.message || data.error || "Attachment upload failed.");
      }
    } catch (err) {
      alert("Attachment upload failed due to connection error.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Get comma-separated list of group participants
  const getGroupMembersNames = () => {
    if (!selectedGroup || !users) return "";
    return selectedGroup.members
      .map((memberId) => {
        if (memberId === currentUser?._id) return "You";
        const u = users.find((user) => user._id === memberId);
        return u ? u.name : null;
      })
      .filter(Boolean)
      .join(", ");
  };

  // 1. EMPTY STATE VIEW
  if (!selectedUser && !selectedGroup) {
    return (
      <section className="flex-1 bg-neutral-950 flex flex-col items-center justify-center p-6 text-center z-10 relative">
        <div className="absolute top-[20%] right-[20%] w-[35%] h-[35%] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-[20%] w-[35%] h-[35%] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none" />

        <div className="max-w-md space-y-6 relative z-10">
          <div className="w-20 h-20 rounded-3xl bg-neutral-900 border border-white/10 flex items-center justify-center mx-auto shadow-2xl">
            <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Start a Conversation</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Select any contact or group room from the sidebar list to retrieve history and begin messaging in real-time.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // 2. ACTIVE CHAT THREAD VIEW
  return (
    <section className="flex-1 bg-neutral-950 flex flex-col h-full overflow-hidden relative z-10">
      
      {/* Thread Header */}
      <div className="px-6 py-4 bg-neutral-900/50 backdrop-blur-md border-b border-white/10 flex items-center justify-between shrink-0 animate-fadeIn">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            {selectedGroup ? (
              // Group Avatar
              <div className="w-10 h-10 rounded-full border border-white/10 bg-neutral-950 flex items-center justify-center overflow-hidden">
                {selectedGroup.avatar ? (
                  <img src={selectedGroup.avatar} alt={selectedGroup.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-indigo-400">
                    {selectedGroup.name.substring(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            ) : (
              // User Avatar
              <>
                <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-neutral-950">
                  <img
                    src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&background=6366F1&color=fff`}
                    alt={selectedUser.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-neutral-900 ${
                    selectedUser.online ? "bg-green-500" : "bg-neutral-500"
                  }`}
                />
              </>
            )}
          </div>
          
          <div className="text-left min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-white leading-tight truncate">
              {selectedGroup ? selectedGroup.name : selectedUser.name}
            </h4>
            {selectedGroup ? (
              <span className="text-[11px] text-neutral-450 truncate block mt-0.5" title={getGroupMembersNames()}>
                {getGroupMembersNames() || `${selectedGroup.members?.length || 0} participants`}
              </span>
            ) : recipientTyping ? (
              <span className="text-xs text-green-400 font-medium animate-pulse block mt-0.5">typing...</span>
            ) : (
              <span className="text-xs text-neutral-450 block mt-0.5">
                {selectedUser.online ? "Online" : "Offline"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages Body Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-neutral-950/20">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
            Say hello to start the conversation! 👋
          </div>
        ) : (
          messages.map((msg) => (
            <Message
              key={msg._id}
              message={msg}
              isMe={msg.sender === currentUser?._id}
              isGroupChat={!!selectedGroup}
              users={users}
            />
          ))
        )}

        {/* Live typing indicator bubble */}
        {recipientTyping && (
          <div className="flex justify-start items-end gap-2 animate-fadeIn">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-white/5 bg-neutral-950 shrink-0">
              <img
                src={
                  selectedUser
                    ? (selectedUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&background=6366F1&color=fff`)
                    : `https://ui-avatars.com/api/?name=Group&background=8B5CF6&color=fff`
                }
                alt="Typing Indicator"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3.5 rounded-2xl bg-neutral-900 text-neutral-300 text-sm flex gap-1 items-center max-w-xs shadow">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {/* Target anchor for auto scrolling */}
        <div ref={scrollRef} />
      </div>

      {/* Footer Text/Attachment Input Bar */}
      <div className="p-4 bg-neutral-900/30 border-t border-white/10 shrink-0 flex items-center gap-3">
        
        {/* Hidden File Input for Attachments */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,application/pdf"
          className="hidden"
        />

        {/* Attachment Clickable Icon Button */}
        <button
          onClick={handleAttachmentClick}
          disabled={uploading}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition duration-200 shrink-0 border border-white/5 disabled:opacity-50 flex items-center justify-center cursor-pointer"
          title="Send Image/Attachment"
        >
          {uploading ? (
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </button>

        {/* Message Input Box */}
        <div className="flex-grow">
          <input
            type="text"
            placeholder="Type your message..."
            value={messageText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-3 rounded-xl bg-neutral-950/80 border border-white/10 focus:border-indigo-500 outline-none text-sm transition duration-300 placeholder-neutral-500 text-white"
          />
        </div>

        {/* Send Button */}
        <button
          onClick={onSendMessage}
          disabled={!messageText.trim()}
          className="p-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-650 hover:to-violet-700 text-white transition duration-200 shrink-0 shadow-md shadow-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </section>
  );
}
