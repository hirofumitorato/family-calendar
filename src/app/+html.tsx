import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Web 版の HTML の外枠（Web のときだけ使われる）。
 * iPhone の「ホーム画面に追加」で、かぞくカレンダーのアイコン・名前で、アドレスバーなしで開くようにする。
 * アイコンは public/ に置き、相対パスで指定する（GitHub Pages の /family-calendar/ の下でも動くように）。
 */
export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return (
    <html lang="ja" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="かぞくカレンダー" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#FFF4EA" />
        <link rel="apple-touch-icon" href="apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="icon-512.png" />
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
