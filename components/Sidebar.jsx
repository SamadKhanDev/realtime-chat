import { useState } from "react";

export default function Sidebar({
  users,
  selectedUser,
  onSelectUser,
  groups = [],
  selectedGroup,
  onSelectGroup,
  onCreateGroupClick,
  typingStatus
}) {
  const [activeTab, setActiveTab] = useState("chats"); // "chats" | "groups"
  const [searchQuery, setSearchQuery] = useState("");

  // Filters based on tab selection
  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-full md:w-80 bg-neutral-900 border-r border-white/10 flex flex-col h-full shrink-0 z-10">
      
      {/* Tab Segment Selector */}
      <div className="flex border-b border-white/10 p-2 gap-1.5 shrink-0 bg-neutral-950/20">
        <button
          onClick={() => {
            setActiveTab("chats");
            setSearchQuery("");
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition duration-200 flex items-center justify-center gap-1.5 outline-none ${
            activeTab === "chats"
              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chats
        </button>
        <button
          onClick={() => {
            setActiveTab("groups");
            setSearchQuery("");
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition duration-200 flex items-center justify-center gap-1.5 outline-none ${
            activeTab === "groups"
              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Groups
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder={activeTab === "chats" ? "Search conversations..." : "Search group rooms..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 rounded-xl bg-neutral-950/80 border border-white/10 focus:border-indigo-500 outline-none text-sm transition duration-300 placeholder-neutral-500 text-white"
          />
          <svg
            className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Create Group Quick Action */}
      {activeTab === "groups" && (
        <div className="p-3 border-b border-white/5 bg-neutral-950/20 shrink-0">
          <button
            onClick={onCreateGroupClick}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-650 hover:to-violet-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 transition-all duration-300 transform active:scale-95 cursor-pointer"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Create New Group
          </button>
        </div>
      )}

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
        {activeTab === "chats" ? (
          // Chats listing
          filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-sm">No contacts found</div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedUser && selectedUser._id === user._id;
              const isTyping = typingStatus && typingStatus[user._id];

              return (
                <button
                  key={user._id}
                  onClick={() => onSelectUser(user)}
                  className={`w-full p-4 flex items-center gap-3 transition duration-200 text-left outline-none ${
                    isSelected
                      ? "bg-indigo-500/10 border-l-4 border-indigo-500"
                      : "hover:bg-white/5 border-l-4 border-transparent"
                  }`}
                >
                  {/* User Avatar with Status Indicator Badge */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 bg-neutral-950">
                      <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366F1&color=fff`}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-neutral-900 ${
                        user.online ? "bg-green-500" : "bg-neutral-500"
                      }`}
                    />
                  </div>

                  {/* Profile details */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-sm font-semibold text-white truncate">{user.name}</span>
                    {isTyping ? (
                      <span className="text-xs text-green-400 font-medium animate-pulse mt-0.5">typing...</span>
                    ) : (
                      <span className="text-xs text-neutral-400 truncate mt-0.5">{user.email}</span>
                    )}
                  </div>
                </button>
              );
            })
          )
        ) : (
          // Groups listing
          filteredGroups.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-sm">No groups joined yet</div>
          ) : (
            filteredGroups.map((group) => {
              const isSelected = selectedGroup && selectedGroup._id === group._id;
              const initials = group.name.substring(0, 2).toUpperCase();

              return (
                <button
                  key={group._id}
                  onClick={() => onSelectGroup(group)}
                  className={`w-full p-4 flex items-center gap-3 transition duration-200 text-left outline-none ${
                    isSelected
                      ? "bg-indigo-500/10 border-l-4 border-indigo-500"
                      : "hover:bg-white/5 border-l-4 border-transparent"
                  }`}
                >
                  {/* Group Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 bg-neutral-950 flex items-center justify-center">
                      {group.avatar ? (
                        <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-indigo-400">{initials}</span>
                      )}
                    </div>
                  </div>

                  {/* Group details */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className="text-sm font-semibold text-white truncate">{group.name}</span>
                    <span className="text-xs text-neutral-450 truncate mt-0.5">
                      {group.members ? `${group.members.length} participants` : "Group conversation"}
                    </span>
                  </div>
                </button>
              );
            })
          )
        )}
      </div>
    </aside>
  );
}
