import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./_context/AuthProvider";
import { SessionProvider } from "next-auth/react";
import localFont from "next/font/local";
import Script from "next/script";
import Image from "next/image";
import { Toaster } from "sonner";
import { ReferrerHandler } from "./_components/ReferrerHandler";
import { DynamicViewport } from "./_components/DynamicViewport";
import { ReactQueryProvider } from "./_providers/ReactQueryProvider";
import { ConsoleBranding } from "./_components/ConsoleBranding";
import { Agentation } from "agentation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const helveticaNeue = localFont({
  src: "../../public/fonts/Helvetica Neue/HelveticaNeue-Regular.woff2",
  variable: "--font-helvetica",
});

const helveticaNeueMedium = localFont({
  src: "../../public/fonts/Helvetica Neue/HelveticaNeue-Medium.woff2",
  variable: "--font-helvetica-medium",
});

const SFProRoundedSemibold = localFont({
  src: "../../public/fonts/SF Pro Rounded/SF-Pro-Rounded-Semibold.woff2",
  variable: "--font-sf-pro-rounded-semibold",
});

const SFProRoundedBold = localFont({
  src: "../../public/fonts/SF Pro Rounded/SF-Pro-Rounded-Bold.woff2",
  variable: "--font-sf-pro-rounded-bold",
});

const SFProRoundedHeavy = localFont({
  src: "../../public/fonts/SF Pro Rounded/SF-Pro-Rounded-Heavy.woff2",
  variable: "--font-sf-pro-rounded-heavy",
});

const SFProRoundedBlack = localFont({
  src: "../../public/fonts/SF Pro Rounded/SF-Pro-Rounded-Black.woff2",
  variable: "--font-sf-pro-rounded-black",
});

const SFProDisplayBold = localFont({
  src: "../../public/fonts/SF Pro Display/SF-Pro-Display-Semibold.woff2",
  variable: "--font-sf-pro-display-bold",
});

const SFProDisplayHeavy = localFont({
  src: "../../public/fonts/SF Pro Display/SF-Pro-Display-Bold.woff2",
  variable: "--font-sf-pro-display-heavy",
});

const Charter = localFont({
  src: "../../public/fonts/Charter/Charter Regular.woff2",
  variable: "--font-charter",
});

export const metadata: Metadata = {
  title: "Medly AI | Personal tutoring for everyone",
  description:
    "Medly AI-powered Science Tutor for GCSE students. Offering personalised 'Teach & Exam' modes, our platform is designed for the UK curriculum for effective, personalised learning.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="min-h-dvh md:min-h-screen">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${helveticaNeue.variable} ${helveticaNeueMedium.variable} ${SFProRoundedSemibold.variable} ${SFProRoundedHeavy.variable} ${SFProRoundedBlack.variable} ${SFProRoundedBold.variable} ${SFProDisplayBold.variable} ${SFProDisplayHeavy.variable} ${Charter.variable} antialiased font-sans min-h-dvh md:min-h-screen`}
      >
        <ConsoleBranding />
        <ReactQueryProvider>
          <SessionProvider>
            <AuthProvider>
              <ReferrerHandler />
              <DynamicViewport />
              {children}
              <Toaster
                richColors
                position="top-center"
                visibleToasts={1}
                toastOptions={{
                  className: "font-rounded-bold",
                }}
              />
              {/* {process.env.NODE_ENV === "development" && <Agentation />} */}
            </AuthProvider>
          </SessionProvider>
        </ReactQueryProvider>

        {process.env.NODE_ENV === "production" && (
          <Image
            height="1"
            width="1"
            style={{ display: "none" }}
            src={`https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_META_PIXEL_ID}&ev=PageView&noscript=1`}
            alt=""
          />
        )}
      </body>
      {/* PostHog - loaded in all environments for feature flags */}
      <Script
        id="posthog-tracking"
        dangerouslySetInnerHTML={{
          __html: `
            !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
            posthog.init('${process.env.NEXT_PUBLIC_POSTHOG_ID}', {
                api_host: '${
                  process.env.NEXT_PUBLIC_POSTHOG_HOST ||
                  "https://eu.i.posthog.com"
                }',
                person_profiles: 'identified_only',
            })
          `,
        }}
      />
      {process.env.NODE_ENV === "production" && (
        <>
          <Script
            id="google-analytics-script"
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}`}
          ></Script>
          <Script
            id="google-analytics-config"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}');
              `,
            }}
          />
          <Script
            id="google-ads-script"
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ADS}`}
          ></Script>
          <Script
            id="google-ads-config"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ADS}');
              `,
            }}
          />
          <Script
            id="meta-pixel"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
                fbq('track', 'PageView');
              `,
            }}
          />
          <Script
            id="tiktok-pixel"
            dangerouslySetInnerHTML={{
              __html: `
                !function (w, d, t) {
                  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
                var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
                ;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
                  ttq.load('${process.env.TIKTOK_PIXEL_CODE}');
                  ttq.page();
                  if (window.location.pathname === '/thankyou') {
                    ttq.track('CompletePayment', {
                      contents: [],
                      value: 60.00,
                      currency: 'GBP'
                    });
                  }
                  if (window.location.pathname === '/plan') {
                    ttq.track('AddToCart', {
                      contents: [],
                      value: 60.00,
                      currency: 'GBP'
                    });
                  }
                }(window, document, 'ttq');
              `,
            }}
          />
          <Script
            id="snap-pixel"
            dangerouslySetInnerHTML={{
              __html: `
                (function(e,t,n){
                  if(e.snaptr)return;
                  var a=e.snaptr=function(){
                    a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)
                  };
                  a.queue=[];
                  var s='script';
                  r=t.createElement(s);
                  r.async=!0;
                  r.src=n;
                  var u=t.getElementsByTagName(s)[0];
                  u.parentNode.insertBefore(r,u);
                })(window,document,'https://sc-static.net/scevent.min.js');
                snaptr('init', 'e2deaf09-2074-4151-ad9f-686e2efb23f3', {});
                snaptr('track', 'PAGE_VIEW');
                if (window.location.pathname === '/thankyou') {
                  snaptr('track', 'PURCHASE', {
                    price: 60.00,
                    currency: 'GBP',
                    transaction_id: new Date().getTime().toString(),
                    number_items: 1
                  });
                }
                if (window.location.pathname === '/plan') {
                  snaptr('track', 'ADD_CART', {
                    price: 60.00,
                    currency: 'GBP',
                    number_items: 1
                  });
                }
              `,
            }}
          />
          <Script
            id="reddit-pixel"
            dangerouslySetInnerHTML={{
              __html: `
                !function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
                rdt('init','a2_htgstm36pq03');
                rdt('track', 'PageVisit');
                if (window.location.pathname === '/thankyou') {
                  rdt('track', 'Purchase');
                }
                if (window.location.pathname === '/plan') {
                  rdt('track', 'AddToCart');
                }
              `,
            }}
          />
        </>
      )}
    </html>
  );
}
