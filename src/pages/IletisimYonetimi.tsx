import React, { useState, useEffect, useCallback, memo } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import Swal from 'sweetalert2';
import { useLoading } from '../contexts/LoadingContext';

// --- Tipler ve Başlangıç Verisi ---

// Tüm iletişim verilerini tek bir tipte topluyoruz.
type IletisimVerisi = {
    address: string;
    email1: string;
    email2: string;
    officePhone: string;
    phoneNumber1: string;
    phoneNumber2: string;
    faxNumber: string;
};

// Başlangıçta state'in boş olmasını sağlıyoruz.
const initialData: IletisimVerisi = {
    address: '',
    email1: '',
    email2: '',
    officePhone: '',
    phoneNumber1: '',
    phoneNumber2: '',
    faxNumber: '',
};

// --- Alt Bileşenler (Performans için ayrıştırıldı) ---

// 1. Veri Gösterim Bileşeni
interface IletisimGorunumuProps {
    data: IletisimVerisi;
}

const IletisimGorunumu: React.FC<IletisimGorunumuProps> = memo(({ data }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-gray-800">
            <p><span className="font-semibold">E-Posta 1:</span> {data.email1 || "—"}</p>
            <p><span className="font-semibold">E-Posta 2:</span> {data.email2 || "—"}</p>
            <p><span className="font-semibold">GSM 1:</span> {data.phoneNumber1 || "—"}</p>
            <p><span className="font-semibold">GSM 2:</span> {data.phoneNumber2 || "—"}</p>
            <p><span className="font-semibold">Ofis Telefonu:</span> {data.officePhone || "—"}</p>
            <p><span className="font-semibold">Fax:</span> {data.faxNumber || "—"}</p>
            <p className="md:col-span-2"><span className="font-semibold">Adres:</span> {data.address || "—"}</p>
        </div>
    );
});
IletisimGorunumu.displayName = "IletisimGorunumu";

// 2. Veri Düzenleme Formu Bileşeni
interface IletisimFormProps {
    data: IletisimVerisi;
    onDataChange: (field: keyof IletisimVerisi, value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
}

const IletisimForm: React.FC<IletisimFormProps> = memo(({ data, onDataChange, onSubmit }) => {
    return (
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inputlar tek bir handler'ı çağıracak şekilde düzenlendi */}
            <div>
                <label className="block text-gray-700 font-medium mb-1">E-Posta 1</label>
                <input type="email" value={data.email1} onChange={(e) => onDataChange('email1', e.target.value)} className="w-full p-3 border rounded-md" />
            </div>
            <div>
                <label className="block text-gray-700 font-medium mb-1">E-Posta 2</label>
                <input type="email" value={data.email2} onChange={(e) => onDataChange('email2', e.target.value)} className="w-full p-3 border rounded-md" />
            </div>
            <div>
                <label className="block text-gray-700 font-medium mb-1">GSM 1</label>
                <input value={data.phoneNumber1} onChange={(e) => onDataChange('phoneNumber1', e.target.value)} className="w-full p-3 border rounded-md" />
            </div>
            <div>
                <label className="block text-gray-700 font-medium mb-1">GSM 2</label>
                <input value={data.phoneNumber2} onChange={(e) => onDataChange('phoneNumber2', e.target.value)} className="w-full p-3 border rounded-md" />
            </div>
            <div>
                <label className="block text-gray-700 font-medium mb-1">Ofis Telefonu</label>
                <input value={data.officePhone} onChange={(e) => onDataChange('officePhone', e.target.value)} className="w-full p-3 border rounded-md" />
            </div>
            <div>
                <label className="block text-gray-700 font-medium mb-1">Fax</label>
                <input value={data.faxNumber} onChange={(e) => onDataChange('faxNumber', e.target.value)} className="w-full p-3 border rounded-md" />
            </div>
            <div className="md:col-span-2">
                <label className="block text-gray-700 font-medium mb-1">Adres</label>
                <textarea value={data.address} onChange={(e) => onDataChange('address', e.target.value)} className="w-full p-3 border rounded-md" />
            </div>
            <div className="md:col-span-2">
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-all">Kaydet</button>
            </div>
        </form>
    );
});
IletisimForm.displayName = "IletisimForm";


// --- Ana Bileşen ---

const IletisimYonetimi: React.FC = () => {
    // 7 ayrı state yerine tek bir state nesnesi kullanıyoruz
    const [iletisimData, setIletisimData] = useState<IletisimVerisi>(initialData);
    const [editMode, setEditMode] = useState(false);
    const [id, setId] = useState<string | null>(null);
    const { showLoading, hideLoading } = useLoading();

    const fetchData = useCallback(async () => {
        showLoading();
        try {
            const response = await api.get('/communications');
            if (response.data && response.data.length > 0) {
                const data = response.data[0];
                setId(data.id);
                // Tek bir set state çağrısı ile tüm veriyi güncelliyoruz
                setIletisimData({
                    email1: data.email1 || '',
                    email2: data.email2 || '',
                    phoneNumber1: data.phoneNumber1 || '',
                    phoneNumber2: data.phoneNumber2 || '',
                    officePhone: data.officePhone || '',
                    faxNumber: data.faxNumber || '',
                    address: data.address || '',
                });
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            hideLoading();
        }
    }, [showLoading, hideLoading]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        showLoading();
        try {
            const response = editMode && id
                ? await api.put(`/communications/${id}`, iletisimData)
                : await api.post('/communications', iletisimData);

            if (response.status === 200 || response.status === 201) {
                Swal.fire({
                    title: 'Başarılı!',
                    text: editMode ? 'İletişim bilgileri güncellendi.' : 'Yeni iletişim bilgisi eklendi.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                });
                setEditMode(false);
                // Eğer yeni bir kayıt oluşturulduysa, ID'yi state'e alıyoruz
                if(response.data.id && !id) {
                    setId(response.data.id);
                }
            }
        } catch (error) {
            console.error('Error submitting data:', error);
            Swal.fire({
                title: 'Hata!',
                text: 'Bilgiler kaydedilirken bir hata oluştu.',
                icon: 'error',
                confirmButtonText: 'Tamam',
            });
        } finally {
            hideLoading();
        }
    }, [editMode, id, iletisimData, showLoading, hideLoading]);

    // Formdaki her değişiklik için tek bir handler fonksiyonu
    const handleDataChange = useCallback((field: keyof IletisimVerisi, value: string) => {
        setIletisimData(prevData => ({
            ...prevData,
            [field]: value,
        }));
    }, []);

    return (
        <Layout>
            <div className="p-6 max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">İletişim Yönetimi</h2>
                    <button
                        onClick={() => setEditMode(prev => !prev)}
                        className={`${editMode ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'} text-white py-2 px-4 rounded-md transition-all`}
                    >
                        {editMode ? 'İptal Et' : 'Düzenle'}
                    </button>
                </div>

                {editMode ? (
                    <IletisimForm
                        data={iletisimData}
                        onDataChange={handleDataChange}
                        onSubmit={handleSubmit}
                    />
                ) : (
                    <IletisimGorunumu data={iletisimData} />
                )}
            </div>
        </Layout>
    );
};

export default IletisimYonetimi;