import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../img/aksuLogo.jpg';

const Header: React.FC = () => {
    const navigate = useNavigate();
    const username = localStorage.getItem('username');
    
    // Separate states for each dropdown
    const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
    const [isSocialDropdownOpen, setIsSocialDropdownOpen] = useState(false);

    // Refs for the dropdowns
    const pageDropdownRef = useRef<HTMLDivElement | null>(null);
    const socialDropdownRef = useRef<HTMLDivElement | null>(null);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    // Toggle functions for dropdowns
    const togglePageDropdown = () => {
        setIsPageDropdownOpen(!isPageDropdownOpen);
    };

    const toggleSocialDropdown = () => {
        setIsSocialDropdownOpen(!isSocialDropdownOpen);
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pageDropdownRef.current && !pageDropdownRef.current.contains(event.target as Node)) {
                setIsPageDropdownOpen(false);
            }
            if (socialDropdownRef.current && !socialDropdownRef.current.contains(event.target as Node)) {
                setIsSocialDropdownOpen(false);
            }
        };

        // Add event listener
        document.addEventListener('click', handleClickOutside);

        // Cleanup on unmount
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    return (
        <header className="bg-white shadow-md">
            <div className="px-6 py-3 flex items-center justify-between">
                {/* Sol Logo */}
                <div className="flex items-center">
                    <img
                        src={logo}
                        alt="Logo"
                        className="h-10 w-auto mr-6 cursor-pointer"
                        onClick={() => window.location.href = '/home'}
                    />

                    {/* Menü */}
                    <nav className="flex space-x-9 text-gray-800 text-base font-semibold relative">
                        <Link to="/home" className="hover:text-blue-600 transition">Anasayfa</Link>

                        {/* Sayfa Yönetimi Dropdown */}
                        <div className="relative" ref={pageDropdownRef}>
                            <button 
                                className="hover:text-blue-600 transition"
                                onClick={togglePageDropdown}
                            >
                                Sayfa Yönetimi
                            </button>
                            {isPageDropdownOpen && (
                                <div className="absolute left-0 mt-2 w-48 bg-white border rounded-lg shadow-lg opacity-100 scale-100 transition-all duration-200 z-10">
                                    <Link to="/bannerYonetimi" className="block px-4 py-2 hover:bg-gray-100">Afiş Yönetimi</Link>
                                    <Link to="/dataOfAksuYonetimi" className="block px-4 py-2 hover:bg-gray-100">Veri Yönetimi</Link>
                                    <Link to="/referansYonetimi" className="block px-4 py-2 hover:bg-gray-100">Referans Yönetimi</Link>
                                    <Link to="/fieldOfActivitiesYonetimi" className="block px-4 py-2 hover:bg-gray-100">Field Of Activities Yönetimi</Link>
                                    <Link to="/brandYonetimi" className="block px-4 py-2 hover:bg-gray-100">Marka Yönetimi</Link>
                                    <Link to="/brandActivityAreasYonetimi" className="block px-4 py-2 hover:bg-gray-100">Marka Etkinlikleri Alanı Yönetimi</Link>
                                    <Link to="/productYonetimi" className="block px-4 py-2 hover:bg-gray-100">Ürün Yönetimi</Link>
                                </div>
                            )}
                        </div>

                        {/* Sosyal Sayfalar Yönetimi Dropdown */}
                        <div className="relative" ref={socialDropdownRef}>
                            <button 
                                className="hover:text-blue-600 transition"
                                onClick={toggleSocialDropdown}
                            >
                                Sosyal Sayfalar Yönetimi
                            </button>
                            {isSocialDropdownOpen && (
                                <div className="absolute left-0 mt-2 w-48 bg-white border rounded-lg shadow-lg opacity-100 scale-100 transition-all duration-200 z-10">
                                    <Link to="/bizeUlasinYonetimi" className="block px-4 py-2 hover:bg-gray-100">Bize Ulaşın Yönetimi</Link>
                                    <Link to="/iletisimYonetimi" className="block px-4 py-2 hover:bg-gray-100">İletişim Yönetimi</Link>
                                </div>
                            )}
                        </div>

                        <Link to="/sifreYonetimi" className="hover:text-blue-600 transition">Şifre Yönetimi</Link>
                    </nav>
                </div>

                {/* Sağ Bilgiler */}
                <div className="flex items-center space-x-6 text-sm text-gray-700">
                    {username && <span className="font-medium">Hoşgeldin, {username}</span>}
                    <button onClick={handleLogout} className="text-red-600 font-semibold hover:underline">Çıkış Yap</button>
                </div>
            </div>
        </header>
    );
};

export default Header;
