import React from 'react';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <html lang="tr">
      <head>
        <link rel="icon" href="/images/secondaryLogo1.ico" type="image/x-icon" />
      </head>
      <body>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow p-6 bg-gray-100">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
};

export default Layout;