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
        <span className="opacity-50">© {new Date().getFullYear()}</span>
        <a
          href="/"
          className="font-semibold text-stone-500 hover:text-amber-700 transition-colors"
        >
          Gia Phả OS — Lưu giữ ký ức gia đình
        </a>
      </div>
    </footer>
  );
}
