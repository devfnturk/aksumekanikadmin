import React, { useState } from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import loginImage from './img/aksuLogo.jpg';
import HomePage from './pages/HomePage'; 
import SifreYonetimi from './pages/SifreYonetimi';
import BannerYonetimi from './pages/BannerYonetimi';
import ReferansYonetimi from './pages/ReferansYonetimi';
import BizeUlasinYonetimi from './pages/BizeUlasinYonetimi';
import IletisimYonetimi from './pages/IletisimYonetimi';
import DataOfAksuYonetimi from './pages/DataOfAksuYonetimi';
import ProjectYonetimi from './pages/ProjectYonetimi';
import api from './api';
import FieldOfActivitiesYonetimi from './pages/FieldOfActivitiesYonetimi';
import BrandYonetimi from './pages/BrandYonetimi';
import BrandActivityAreasYonetimi from './pages/BrandActivityAreasYonetimi';
import ProductYonetimi from './pages/ProductYonetimi';
import 'sweetalert2/dist/sweetalert2.min.css';
import CatalogYönetimi from './pages/CatalogYönetimi';
const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/sifreYonetimi" element={<SifreYonetimi />} />
        <Route path="/dataOfAksuYonetimi" element={<DataOfAksuYonetimi />} />
        <Route path="/bannerYonetimi" element={<BannerYonetimi />} />
        <Route path="/referansYonetimi" element={<ReferansYonetimi />} />
        <Route path="/bizeUlasinYonetimi" element={<BizeUlasinYonetimi />} />
        <Route path="/iletisimYonetimi" element={<IletisimYonetimi />} />
        <Route path="/catalogYönetimi" element={<CatalogYönetimi />} />
        <Route path="/projectYonetimi" element={<ProjectYonetimi />} />
        <Route path="/fieldOfActivitiesYonetimi" element={<FieldOfActivitiesYonetimi />} />
        <Route path="/brandYonetimi" element={<BrandYonetimi />} />
        <Route path="/brandActivityAreasYonetimi" element={<BrandActivityAreasYonetimi />} />
        <Route path="/productYonetimi" element={<ProductYonetimi />} />

      </Routes>
    </Router>
  );
};

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
  
    try {
      const response = await api.post('https://aksu-mekanik-9bhv.onrender.com/auth/login', {
        username,
        password
      });
      console.log("response.data",response.data)
      // Backend başarılı yanıt döndüyse (örneğin token varsa)
      if (response.status === 200) {
        const data = response.data;
        localStorage.setItem('username', username);
        localStorage.setItem('token', data.token); // JWT token gibi bir şey döndüyse
  
        navigate('/home');
      } else {
        alert('Giriş başarısız');
      }
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        alert('Kullanıcı adı veya şifre yanlış');
      } else {
        console.error('Giriş hatası:', error);
        alert('Bir hata oluştu. Daha sonra tekrar deneyin.');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm">
        <div className="mb-6">
          <img
            src={loginImage}
            alt="Login"
            className="w-full h-32 object-cover rounded-md"
          />
        </div>
        <h2 className="text-2xl font-bold mb-6 text-center">Giriş Yap</h2>
        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-gray-700">Kullanıcı Adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Kullanıcı Adını Giriniz"
            />
          </div>
          <div>
            <label className="block text-gray-700">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Şifrenizi Giriniz"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-200"
          >
            Giriş yap
          </button>
        </form>
      </div>
    </div>
  );
};


export default App;
