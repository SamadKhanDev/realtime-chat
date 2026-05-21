import { useEffect, useState, useContext } from "react";
import { translateText } from "../utils/translate";
import { LanguageContext } from "../lib/LanguageContext";

export default function Message({ message, isMe = false, isGroupChat, users = [] }) {
  const [formattedTime, setFormattedTime] = useState("");
  const [translatedText, setTranslatedText] = useState(message.text);

  // ✅ Correct: hooks at top level
  const { language } = useContext(LanguageContext);

  // Format time
  useEffect(() => {
    if (message.createdAt) {
      const date = new Date(message.createdAt);
      setFormattedTime(
        date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }
  }, [message.createdAt]);

  // Translation effect - only for messages sent by current user
  useEffect(() => {
    if (!isMe) return; // Skip translation for received messages
    let isMounted = true;

    async function doTranslate() {
      if (!message.text) return;

      try {
        const result = await translateText(message.text, language);

        if (isMounted) {
          setTranslatedText(result);
        }
      } catch (err) {
        console.error("Translation error:", err);

        if (isMounted) {
          setTranslatedText(message.text);
        }
      }
    }

    doTranslate();

    return () => {
      isMounted = false;
    };
  }, [message.text, language, isMe]);

  // Get sender name (for group chat)
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
      "text-purple-400",
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
    <div
      className={`flex w-full ${
        isMe ? "justify-end" : "justify-start"
      } mb-2 animate-fadeIn`}
    >
      <div
        className={`max-w-[70%] sm:max-w-md p-4 rounded-2xl shadow relative flex flex-col ${
          isMe
            ? "bg-gradient-to-tr from-indigo-500 to-violet-600 text-white rounded-tr-none"
            : "bg-neutral-900 text-neutral-200 border border-white/5 rounded-tl-none"
        }`}
      >
        {/* Group sender name */}
        {isGroupChat && !isMe && (
          <span
            className={`text-[11px] font-black leading-none mb-1.5 tracking-wide select-none ${getSenderColor(
              senderName
            )}`}
          >
            {senderName}
          </span>
        )}

        {/* Image attachment */}
        {message.image && (
          <div className="rounded-lg overflow-hidden border border-white/10 max-w-full max-h-[250px] mb-1">
            <img
              src={message.image}
              alt="Attachment"
              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
              onClick={() => window.open(message.image, "_blank")}
            />
          </div>
        )}

        {/* File attachment */}
        {message.file && !message.image && (
          <a
            href={message.file}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2.5 rounded-xl bg-black/20 hover:bg-black/30 border border-white/5 text-xs text-indigo-400 font-medium transition mb-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="truncate max-w-[150px]">
              View Attachment Document
            </span>
          </a>
        )}

        {/* Message text (TRANSLATED) */}
        {message.text && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {translatedText}
          </p>
        )}

        {/* Timestamp + status */}
        <div className="flex items-center gap-1.5 self-end mt-1.5 select-none">
          {formattedTime && (
            <span
              className={`text-[10px] ${
                isMe ? "text-indigo-200/80" : "text-neutral-500"
              }`}
            >
              {formattedTime}
            </span>
          )}

          {isMe && (
            <span className="leading-none shrink-0">
              {message.status === "pending" && (
                <span className="text-indigo-200/60 text-xs">⏳</span>
              )}
              {message.status === "sent" && (
                <span className="text-indigo-200/80 text-xs">✓</span>
              )}
              {(message.status === "delivered" || !message.status) && (
                <span className="text-indigo-200/80 text-xs">✓✓</span>
              )}
              {message.status === "failed" && (
                <span className="text-red-400 text-xs">⚠</span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}