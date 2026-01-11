import { SignUp } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Logo */}
        <div className="mb-8">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="https://elyql1q8be.ufs.sh/f/SidHyTM6vHFNkrTSPMxqrLXWoAOxHZEIn5u8KwidYCeQ4cFR"
              alt="Open Banana Logo"
              width={48}
              height={48}
              className="rounded-lg"
            />
            <span className="text-xl font-bold text-white">Open Banana</span>
          </Link>
        </div>

        {/* Sign Up Component */}
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-zinc-900 border border-zinc-800 shadow-2xl",
              headerTitle: "text-white",
              headerSubtitle: "text-gray-400",
              socialButtonsBlockButton:
                "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700",
              socialButtonsBlockButtonText: "text-white",
              dividerLine: "bg-zinc-700",
              dividerText: "text-gray-400",
              formFieldLabel: "text-gray-300",
              formFieldInput:
                "bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500",
              formButtonPrimary:
                "bg-[#6c47ff] hover:bg-[#5a3ad9] text-white",
              footerActionLink: "text-[#6c47ff] hover:text-[#5a3ad9]",
              identityPreviewText: "text-white",
              identityPreviewEditButton: "text-[#6c47ff]",
            },
          }}
        />
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-gray-600/50">
        <div className="flex items-center justify-center gap-2 md:gap-3 flex-wrap">
          <a
            href="https://www.threads.com/faizntfd"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs md:text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-2"
          >
            <span>follow Faiz Intifada on threads</span>
            <svg
              className="w-3 h-3 md:w-4 md:h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
          <span className="text-gray-600">•</span>
          <a
            href="/privacy-policy"
            className="text-xs md:text-sm text-gray-400 hover:text-white transition-colors duration-200"
          >
            Privacy Policy
          </a>
          <span className="text-gray-600">•</span>
          <a
            href="https://saweria.co/faizintifada"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs md:text-sm text-gray-400 hover:text-white transition-colors duration-200 flex items-center gap-1"
          >
            Support Author!
            <svg
              className="w-3 h-3 md:w-4 md:h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}
