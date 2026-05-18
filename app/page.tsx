import Link from "next/link";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  let loggedIn = false;

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || "default_super_secret_key";
      jwt.verify(token, secret);
      loggedIn = true;
    } catch (err) {
      // Invalid token
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-between overflow-x-hidden relative font-sans">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-extrabold text-xl tracking-tighter text-white">R</span>
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
            RealChat
          </span>
        </div>

        <nav className="flex gap-4">
          {loggedIn ? (
            <Link
              href="/chat"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 transition duration-300 font-medium text-sm text-white flex items-center"
            >
              Go to Chat
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-xl hover:bg-white/5 transition duration-300 font-medium text-sm text-neutral-300 hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 transition duration-300 font-medium text-sm text-white shadow-lg shadow-indigo-500/25 flex items-center"
              >
                Get Started
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-grow flex items-center justify-center z-10 px-6 py-12">
        <div className="max-w-4xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            Real-Time Messaging Platform
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-white leading-tight">
            Connect Instantly with{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              RealChat
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-neutral-400 text-lg sm:text-xl font-normal leading-relaxed">
            Experience lightning-fast communication, rich media sharing, and gorgeous, seamless interactions. Crafted with Next.js, TailwindCSS, and Socket.io.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            {loggedIn ? (
              <Link
                href="/chat"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 hover:opacity-95 transition duration-300 font-semibold text-white shadow-xl shadow-indigo-500/20 text-center flex items-center justify-center gap-2"
              >
                Launch Chat App
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 transition duration-300 font-semibold text-white shadow-xl shadow-indigo-500/20 text-center flex items-center justify-center gap-2"
                >
                  Create Free Account
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition duration-300 font-semibold text-white text-center flex items-center justify-center"
                >
                  Sign in to Chat
                </Link>
              </>
            )}
          </div>

          {/* Premium UI Mockup Preview */}
          <div className="pt-16 max-w-5xl mx-auto">
            <div className="relative p-2.5 rounded-3xl bg-neutral-900 border border-white/10 shadow-2xl shadow-neutral-950 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition duration-700 pointer-events-none" />
              <div className="h-4 bg-neutral-800 rounded-t-2xl flex items-center px-4 gap-1.5 border-b border-white/5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
              <div className="bg-neutral-950 p-6 sm:p-12 text-left flex flex-col gap-6 font-mono text-sm border-t border-white/5 text-neutral-400">
                <div className="flex gap-2">
                  <span className="text-indigo-400">➜</span>
                  <span>Connecting to RealChat sockets...</span>
                </div>
                <div className="flex gap-2 text-green-400">
                  <span>✔</span>
                  <span>Established active connection to server at port 3000!</span>
                </div>
                <div className="flex gap-2 text-violet-400">
                  <span>✦</span>
                  <span>Ready to send real-time secure messages. Welcome to the future of chat!</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center z-10 gap-4">
        <span className="text-neutral-500 text-sm">
          &copy; {new Date().getFullYear()} RealChat Inc. All rights reserved.
        </span>
        <div className="flex gap-6 text-sm text-neutral-500">
          <a href="#" className="hover:text-white transition duration-300">Privacy Policy</a>
          <a href="#" className="hover:text-white transition duration-300">Terms of Service</a>
          <a href="#" className="hover:text-white transition duration-300">Contact Support</a>
        </div>
      </footer>
    </div>
  );
}
