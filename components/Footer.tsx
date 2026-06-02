export interface FooterProps {
  className?: string;
  showDisclaimer?: boolean;
}

export default function Footer({
  className = "",
  showDisclaimer = false,
}: FooterProps) {
  return (
    <footer
      className={`py-3 text-center text-xs text-stone-400 ${className} backdrop-blur-sm`}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-2 flex-wrap">
        {showDisclaimer && (
          <>
            <span>Nội dung có thể thiếu sót. Vui lòng đóng góp để gia phả chính xác hơn.</span>
            <span className="opacity-30">•</span>
          </>
        )}
        <a
          href="https://github.com/homielab/giapha-os"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-stone-500 hover:text-amber-700 transition-colors inline-flex items-center gap-1"
        >
          <svg
            viewBox="0 0 24 24"
            width="12"
            height="12"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
          Gia Phả OS
        </a>
        <span className="opacity-30">by</span>
        <a
          href="https://homielab.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-green-600 hover:text-amber-700 transition-colors"
        >
          HomieLab
        </a>
      </div>
    </footer>
  );
}
