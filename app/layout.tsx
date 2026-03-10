import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

const brand = process.env.NEXT_PUBLIC_BRAND_NAME ?? '2brain'

export const metadata: Metadata = {
  title: `${brand} — AI Credit Platform`,
  description: 'Buy AI credits with VietQR bank transfer',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className={`${geist.variable} antialiased`}>{children}</body>
    </html>
  )
}
