export default function WatchLoading() {
  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <img src="/logo.png" alt="مشهد" className="w-16 h-16 animate-pulse" />
        <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-[#E50914] rounded-full animate-[shimmer_1s_ease-in-out_infinite]" />
        </div>
        <p className="text-[#666] text-sm">جاري تحميل المشغّل...</p>
      </div>
    </div>
  )
}
