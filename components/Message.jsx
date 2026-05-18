import { useEffect, useState } from "react";

export default function Message({ message, isMe, isGroupChat, users = [] }) {
  const [formattedTime, setFormattedTime] = useState("");

  // Prevent hydration mismatch by formatting time only on client mount
  useEffect(() => {
    if (message.createdAt) {
      const date = new Date(message.createdAt);
      setFormattedTime(
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    }
  }, [message.createdAt]);

  const getSenderName = () => {
    if (!users || !message.sender) return "Unknown User";
    const u = users.find((user) => user._id === message.sender);
    return u ? u.name : "Unknown User";
  };

  const getSenderColor = (name) => {
    const colors = [
      "text-rose-400",
      "text-pink-400",
      "text-amber-400",
      "text-emerald-400",
      "text-teal-400",
      "text-cyan-400",
      "text-sky-400",
      "text-indigo-400",
      "text-violet-400",
      "text-fuchsia-400",
      "text-purple-400"
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const senderName = getSenderName();

  return (
    <div className={`flex w-full ${isMe ? "justify-end" : "justify-start"} mb-2 animate-fadeIn`}>
      <div
        className={`max-w-[70%] sm:max-w-md p-4 rounded-2xl shadow relative flex flex-col ${
          isMe
            ? "bg-gradient-to-tr from-indigo-500 to-violet-600 text-white rounded-tr-none"
            : "bg-neutral-900 text-neutral-200 border border-white/5 rounded-tl-none"
        }`}
      >
        
        {/* Render Group Chat Sender Name signature (like WhatsApp) */}
        {isGroupChat && !isMe && (
          <span className={`text-[11px] font-black leading-none mb-1.5 tracking-wide select-none ${getSenderColor(senderName)}`}>
            {senderName}
          </span>
        )}
        
        {/* Render Image Attachment if present */}
        {message.image && (
          <div className="rounded-lg overflow-hidden border border-white/10 max-w-full max-h-[250px] mb-1">
            <img
              src={message.image}
              alt="Uploaded Attachment"
              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition duration-200"
              onClick={() => window.open(message.image, "_blank")}
            />
          </div>
        )}

        {/* Render File Attachment if present */}
        {message.file && !message.image && (
          <a
            href={message.file}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 rounded-xl bg-black/20 hover:bg-black/30 border border-white/5 text-xs text-indigo-400 font-medium transition duration-200 mb-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="truncate max-w-[150px]">View Attachment Document</span>
          </a>
        )}

        {/* Message text */}
        {message.text && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
        )}

        {/* Timestamp & Real-time Delivery Status Indicators */}
        <div className="flex items-center gap-1.5 self-end mt-1.5 select-none">
          {formattedTime && (
            <span
              className={`text-[10px] leading-none ${
                isMe ? "text-indigo-200/80" : "text-neutral-500"
              }`}
            >
              {formattedTime}
            </span>
          )}

          {isMe && (
            <span className="leading-none shrink-0" title={message.status || "delivered"}>
              {message.status === "pending" && (
                <svg className="w-3 h-3 text-indigo-200/60 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {message.status === "failed" && (
                <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {message.status === "sent" && (
                <svg className="w-3.5 h-3.5 text-indigo-200/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {(message.status === "delivered" || !message.status) && (
                <div className="flex -space-x-1 items-center">
                  <svg className="w-3.5 h-3.5 text-indigo-200/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  <svg className="w-3.5 h-3.5 text-indigo-200/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
