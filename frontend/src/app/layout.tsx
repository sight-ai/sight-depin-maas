import { Providers } from './providers'
import './globals.css'
import './styles/fonts.css'


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{
      }}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}