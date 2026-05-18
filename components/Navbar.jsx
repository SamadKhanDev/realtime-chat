import NotificationBell from "./NotificationBell";

export default function Navbar({
  user,
  onLogout,
  notifications = [],
  setNotifications,
  onSelectUser,
  onSelectGroup,
  users = [],
  groups = []
}) {
  return (
    <header className="w-full bg-neutral-900/50 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center z-20 shrink-0">
      
      {/* Brand logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <span className="font-extrabold text-base tracking-tighter text-white">R</span>
        </div>
        <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent hidden sm:inline-block">
          RealChat
        </span>
      </div>

      {/* Right-side Profile, Notification Bell & Action info */}
      <div className="flex items-center gap-4">
        {user && (
          <>
            {/* Notification Bell Component */}
            <NotificationBell
              notifications={notifications}
              setNotifications={setNotifications}
              onSelectUser={onSelectUser}
              onSelectGroup={onSelectGroup}
              users={users}
              groups={groups}
            />

            {/* Profile Info */}
            <div className="flex items-center gap-3 pr-3 border-r border-white/10">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 bg-neutral-950">
                <img
                  src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366F1&color=fff`}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-sm font-semibold text-white leading-tight">{user.name}</span>
                <span className="text-xs text-neutral-400 leading-none">{user.email}</span>
              </div>
            </div>
          </>
        )}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/5 hover:border-red-500/20 text-neutral-300 transition duration-300 text-sm font-medium"
          title="Sign Out"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
