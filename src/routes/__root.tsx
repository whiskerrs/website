import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Whisker",
      },
      {
        name: "description",
        content:
          "Whisker is a Rust-first framework for building native Android and iOS apps — ergonomic UI, Lynx-powered CSS, sub-second hot reload, and native modules.",
      },
      // Open Graph
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Whisker" },
      { property: "og:url", content: "https://whisker.rs" },
      {
        property: "og:title",
        content: "Whisker — Build native mobile apps in Rust",
      },
      {
        property: "og:description",
        content:
          "Ergonomic UI, native widgets, Lynx-powered CSS, and sub-second hot reload — for iOS and Android, in Rust.",
      },
      { property: "og:image", content: "https://whisker.rs/og.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      {
        property: "og:image:alt",
        content: "Whisker — Build native mobile apps in Rust",
      },
      // Twitter
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "Whisker — Build native mobile apps in Rust",
      },
      {
        name: "twitter:description",
        content:
          "Ergonomic UI, native widgets, Lynx-powered CSS, and sub-second hot reload — for iOS and Android, in Rust.",
      },
      { name: "twitter:image", content: "https://whisker.rs/og.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/favicon.ico",
        sizes: "any",
      },
      {
        rel: "icon",
        type: "image/png",
        href: "/logo192.png",
        sizes: "192x192",
      },
      {
        rel: "apple-touch-icon",
        href: "/logo192.png",
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
