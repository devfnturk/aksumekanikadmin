import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';

const pages = [
  { path: '/bannerYonetimi', label: 'Afiş Yönetimi' },
  { path: '/dataOfAksuYonetimi', label: 'Veri Yönetimi' },
  { path: '/referansYonetimi', label: 'Referans Yönetimi' },
  { path: '/projectYonetimi', label: 'Proje Yönetimi' },
  { path: '/catalogYönetimi', label: 'Katalog Yönetimi' },
  { path: '/brandYonetimi', label: 'Marka Yönetimi' },
  { path: '/brandActivityAreasYonetimi', label: 'Marka Etkinlikleri Alanı Yönetimi' },
  { path: '/productYonetimi', label: 'Ürün Yönetimi' },
  { path: '/iletisimYonetimi', label: 'İletişim Yönetimi' },
  { path: '/bizeUlasinYonetimi', label: 'Bize Ulaşın Yönetimi' },
  { path: '/sifreYonetimi', label: 'Şifre Yönetimi' },


];

const HomePage: React.FC = () => {
  return (
    <Layout>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {pages.map((page) => (
          <Link
            key={page.path}
            to={page.path}
            className="p-6 bg-white rounded-lg shadow hover:shadow-lg hover:bg-gray-50 transition duration-200 border border-gray-200"
          >
            <h3 className="text-lg font-semibold text-blue-600">{page.label}</h3>
            <p className="text-sm text-gray-500 mt-1">{page.label} Sayfasına Git</p>
          </Link>
        ))}
      </div>
    </Layout>
  );
};

export default HomePage;
