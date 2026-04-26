'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

export function SplashScreen() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Check if we've already shown the splash this session
    if (sessionStorage.getItem('mashhad-splash-shown')) {
      setVisible(false)
      return
    }
    const timer = setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem('mashhad-splash-shown', '1')
    }, 2200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
        >
          {/* Subtle radial glow behind logo */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.15, scale: 1.2 }}
              transition={{ duration: 1.8, ease: 'easeOut' }}
              className="w-[400px] h-[400px] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(229,9,20,0.3) 0%, transparent 70%)' }}
            />
          </div>

          {/* Logo with animation */}
          <div className="relative flex flex-col items-center gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <Image
                src="/logo.png"
                alt="مشهد"
                width={220}
                height={220}
                priority
                className="drop-shadow-2xl"
              />
            </motion.div>

            {/* Animated loading bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="w-32 h-[2px] bg-white/10 rounded-full overflow-hidden"
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  duration: 1,
                  delay: 0.7,
                  ease: 'easeInOut',
                  repeat: Infinity,
                }}
                className="w-full h-full bg-gradient-to-r from-transparent via-[#E50914] to-transparent"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
