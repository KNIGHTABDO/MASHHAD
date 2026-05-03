import { Navbar } from '@/components/navigation/Navbar'
import { Footer } from '@/components/navigation/Footer'
import { PromotionModal } from '@/components/ui/PromotionModal'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <Navbar />
      <PromotionModal />
      <main className="pt-16 flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
