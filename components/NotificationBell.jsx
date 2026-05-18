import { useState, useRef, useEffect } from "react";

export default function NotificationBell({
  notifications = [],
  setNotifications,
  onSelectUser,
  onSelectGroup,
  users = [],
  groups = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper to find sender profile details
  const getSenderDetails = (senderId) => {
    const sender = users.find((u) => u._id === senderId);
    return sender || {
      name: "Unknown User",
      avatar: ""
    };
  };

  const handleNotificationClick = (notification) => {
    if (notification.groupId) {
      const group = groups.find((g) => g._id === notification.groupId);
      if (group) {
        onSelectGroup(group);
        // Remove all notifications from this group
        setNotifications((prev) => prev.filter((n) => n.groupId !== notification.groupId));
      }
    } else {
      const sender = users.find((u) => u._id === notification.sender);
      if (sender) {
        onSelectUser(sender);
        // Remove all notifications from this sender
        setNotifications((prev) => prev.filter((n) => n.sender !== notification.sender));
      }
    }
    setIsOpen(false);
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    setNotifications([]);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2.5 rounded-xl border transition-all duration-300 relative flex items-center justify-center shrink-0 ${
          isOpen
            ? "bg-indigo-500/10 border-indigo-500/30 text-white"
            : "bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border-white/5 hover:border-white/10"
        }`}
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread count badge */}
        {notifications.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1.5 rounded-full bg-gradient-to-r from-rose-500 to-red-600 border border-neutral-900 text-[10px] font-black text-white flex items-center justify-center animate-pulse">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Glassmorphic Dropdown Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300 tracking-wide">Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition duration-200"
              >
                Clear all
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-72 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-neutral-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5" />
                  </svg>
                </div>
                <span className="text-xs text-neutral-500 font-medium">All caught up! No unread messages.</span>
              </div>
            ) : (
              notifications.map((notif) => {
                const sender = getSenderDetails(notif.sender);
                return (
                  <button
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className="w-full p-4 flex items-start gap-3 hover:bg-white/5 transition duration-200 text-left outline-none"
                  >
                    {/* User Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 bg-neutral-950">
                        <img
                          src={sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(sender.name)}&background=6366F1&color=fff`}
                          alt={sender.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Notification content */}
                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-semibold text-white truncate">{sender.name}</span>
                        <span className="text-[9px] text-neutral-500 shrink-0">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 truncate mt-1">
                        {notif.text || "📷 Sent an attachment"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
