import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-200 text-center text-sm text-gray-600 py-4 mt-auto">
      © {new Date().getFullYear()} Aksu Mekanik. Tüm hakları saklıdır.
    </footer>
  );
};

export default Footer;