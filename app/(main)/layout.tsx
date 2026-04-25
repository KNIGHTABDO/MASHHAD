import { Navbar } from '@/components/navigation/Navbar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}
