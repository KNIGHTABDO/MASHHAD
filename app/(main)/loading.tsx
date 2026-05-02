import Image from 'next/image'

export default function MainLoading() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Image src="/logo.png" alt="مشهد" width={64} height={64} className="w-16 h-16 animate-pulse" priority />
        <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full w-1/2 bg-[#E50914] rounded-full animate-[shimmer_1s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  )
}
