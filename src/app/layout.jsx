import Providers from './providers'
import './globals.css'

export const metadata = {
  title: 'OfferFlow - 把求职从焦虑，变成可管理的流程',
  description: '求职全流程管理工具 — 覆盖岗位收集→投递→面试→复盘→决策全链路',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "try{var t=localStorage.getItem('app-theme')||((matchMedia&&matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark');document.documentElement.classList.toggle('dark',t==='dark');if(sessionStorage.getItem('offerflow_splash_shown')==='true')document.documentElement.dataset.offerflowSplashShown='true'}catch(e){}",
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
