import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import Swal from 'sweetalert2';
const IletisimYonetimi: React.FC = () => {
    const [adress, setAdress] = useState('');
    const [eposta1, setEposta1] = useState('');
    const [eposta2, setEposta2] = useState('');
    const [ofisTelefon, setOfisTelefon] = useState('');
    const [gsm1, setGsm1] = useState('');
    const [gsm2, setGsm2] = useState('');
    const [fax, setFax] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [id, setId] = useState<string | null>(null); // Store the id of the communication entry

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/communications');
                const data = response.data[0]; // Assuming the data array contains a single item

                if (data) {
                    setId(data.id); // Set the id from the backend response
                    setEposta1(data.email1 || '');
                    setEposta2(data.email2 || '');
                    setGsm1(data.phoneNumber1 || '');
                    setGsm2(data.phoneNumber2 || '');
                    setOfisTelefon(data.officePhone || '');
                    setFax(data.faxNumber || '');
                    setAdress(data.address || '');
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const updatedData = {
            address: adress,
            email1: eposta1,
            email2: eposta2,
            officePhone: ofisTelefon,
            phoneNumber1: gsm1,
            phoneNumber2: gsm2,
            faxNumber: fax,
        };

        try {
            let response;

            if (editMode && id) {
                response = await api.put(
                    `/communications/${id}`,
                    updatedData,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'accept': '*/*',
                        },
                    }
                );
            } else {
                response = await api.post(
                    '/communications',
                    updatedData,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'accept': '*/*',
                        },
                    }
                );
            }

            if (response.status === 200 || response.status === 201) {
                Swal.fire({
                    title: 'Başarılı!',
                    text: editMode ? 'İletişim bilgileri güncellendi.' : 'Yeni iletişim bilgisi eklendi.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    customClass: {
                        popup: 'rounded-xl shadow-lg',
                        title: 'text-lg font-bold',
                        htmlContainer: 'text-gray-700',
                    },
                });
                setEditMode(false);
            }
        } catch (error) {
            console.error('Error submitting data:', error);
            Swal.fire({
                title: 'Hata!',
                text: 'Bilgiler kaydedilirken bir hata oluştu.',
                icon: 'error',
                confirmButtonText: 'Tamam',
                buttonsStyling: false,
                customClass: {
                    popup: 'rounded-xl shadow-lg',
                    confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
                },
            });
        }
    };


    return (
        <Layout>
            <div className="p-6 max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">İletişim Yönetimi</h2>
                    {!editMode ? (
                        <button
                            onClick={() => setEditMode(true)}
                            className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-all"
                        >
                            Düzenle
                        </button>
                    ) : (
                        <button
                            onClick={() => setEditMode(false)}
                            className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600 transition-all"
                        >
                            İptal Et
                        </button>
                    )}
                </div>

                {editMode ? (
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-gray-700 font-medium mb-1">E-Posta 1</label>
                            <input
                                type="email"
                                value={eposta1}
                                onChange={(e) => setEposta1(e.target.value)}
                                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="E Posta1 giriniz"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-1">E-Posta 2</label>
                            <input
                                type="email"
                                value={eposta2}
                                onChange={(e) => setEposta2(e.target.value)}
                                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="E Posta2 giriniz"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-1">GSM 1</label>
                            <input
                                value={gsm1}
                                onChange={(e) => setGsm1(e.target.value)}
                                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Gsm1 giriniz"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-1">GSM 2</label>
                            <input
                                value={gsm2}
                                onChange={(e) => setGsm2(e.target.value)}
                                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Gsm2 giriniz"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium mb-1">Ofis Telefonu</label>
                            <input
                                value={ofisTelefon}
                                onChange={(e) => setOfisTelefon(e.target.value)}
                                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ofis Telefonu giriniz"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium mb-1">Fax</label>
                            <input
                                value={fax}
                                onChange={(e) => setFax(e.target.value)}
                                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Fax giriniz"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium mb-1">Adres</label>
                            <textarea
                                value={adress}
                                onChange={(e) => setAdress(e.target.value)}
                                className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Adres giriniz"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-all"
                            >
                                Kaydet
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-gray-800">
                        <p><span className="font-semibold">E-Posta 1:</span> {eposta1 || "E Posta1 bulunmuyor."}</p>
                        <p><span className="font-semibold">E-Posta 2:</span> {eposta2 || "E Posta2 bulunmuyor."}</p>
                        <p><span className="font-semibold">GSM 1:</span> {gsm1 || "Gsm1 bulunmuyor."}</p>
                        <p><span className="font-semibold">GSM 2:</span> {gsm2 || "Gsm2 bulunmuyor."}</p>
                        <p><span className="font-semibold">Ofis Telefonu:</span> {ofisTelefon || "Ofis Telefonu bulunmuyor."}</p>
                        <p><span className="font-semibold">Fax:</span> {fax || "Fax bulunmuyor."}</p>
                        <p><span className="font-semibold">Adres:</span> {adress || "Adres bulunmuyor"}</p>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default IletisimYonetimi;
