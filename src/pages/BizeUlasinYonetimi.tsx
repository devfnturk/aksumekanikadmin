import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import Swal from 'sweetalert2';
type Section = {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    subject: string;
    message: string;
    createdAt: string;
};

type ConfirmModalProps = {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-sm">
            <p className="text-center text-lg font-medium">{message}</p>
            <div className="mt-6 flex justify-end space-x-4">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                    Vazgeç
                </button>
                <button
                    onClick={onConfirm}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Evet, Sil
                </button>
            </div>
        </div>
    </div>
);

const BizeUlasinYonetimi: React.FC = () => {
    const [sections, setSections] = useState<Section[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [selectedSection, setSelectedSection] = useState<Section | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState<boolean>(false);

    // Verileri API'den çekme
    useEffect(() => {
        const fetchMessages = async () => {
            setLoading(true);
            try {
                const response = await api.get('/contact-us', {
                    headers: {
                        accept: '*/*'
                    }
                });
                setSections(response.data);
            } catch (error) {
                console.error('Veri getirme hatası:', error);
                alert('Veriler alınırken bir hata oluştu.');
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, []);

    // Checkbox toggle işlemi
    const toggleCheckbox = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    // Silme işlemini başlatma
    const handleDeleteClick = async () => {
        if (selectedIds.length === 0) return;

        const result = await Swal.fire({
            title: 'Seçilen mesajları silmek istediğine emin misin?',
            text: `${selectedIds.length} adet mesaj silinecek.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, Sil',
            cancelButtonText: 'Vazgeç',
            buttonsStyling: false,
            reverseButtons: true, // Butonların yerini değiştirir (cancel solda olur)
            customClass: {
                popup: 'rounded-xl shadow-lg',
                title: 'text-xl font-semibold',
                htmlContainer: 'text-gray-700',
                actions: 'flex justify-center gap-4 mt-4',
                confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
                cancelButton: 'bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400',
            },
        });

        if (result.isConfirmed) {
            confirmDelete(); // senin delete fonksiyonunu çağırır
            Swal.fire({
                title: 'Başarılı!',
                text: 'Seçilen mesajlar silindi.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
            });
        }
    };

    // Silme işlemini onaylama
    const confirmDelete = async () => {
        try {
            // Silme işlemini her bir ID için yapıyoruz
            for (const id of selectedIds) {
                const response = await api.delete(`/contact-us/${id}`, {
                    headers: {
                        accept: '*/*'
                    }
                });

                if (response.status === 200) {
                    setSections((prev) => prev.filter((section) => section.id !== id));
                } else {
                    alert("Silme işlemi başarısız oldu.");
                }
            }

            setSelectedIds([]);
        } catch (error) {
            console.error("Silme hatası:", error);
            alert("Sunucuya bağlanırken bir hata oluştu.");
        } finally {
            setShowConfirm(false);
        }
    };

    // Modal'ı kapatma
    const closeModal = () => {
        setSelectedSection(null);
    };

    return (
        <Layout>
            <div className="p-6 space-y-6">
                <h1 className="text-2xl font-bold">Bize Ulaşın Yönetimi</h1>

                <div className="flex justify-end">
                    <button
                        onClick={handleDeleteClick}
                        disabled={selectedIds.length === 0 || loading}
                        className={`px-4 py-2 mb-4 rounded ${selectedIds.length === 0 || loading
                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            : 'bg-red-500 text-white hover:bg-red-600'
                            }`}
                    >
                        {loading ? 'Siliniyor...' : 'Seçilenleri Sil'}
                    </button>
                </div>

                {loading ? (
                    <div className="text-center text-lg">Yükleniyor...</div>
                ) : (
                    <div className="overflow-x-auto bg-white rounded-xl shadow">
                        <table className="min-w-full table-auto border-collapse">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 border">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.length === sections.length}
                                            onChange={(e) =>
                                                setSelectedIds(
                                                    e.target.checked
                                                        ? sections.map((s) => s.id)
                                                        : []
                                                )
                                            }
                                        />
                                    </th>
                                    <th className="p-3 border">Name</th>
                                    <th className="p-3 border">E-posta</th>
                                    <th className="p-3 border">Telefon</th>
                                    <th className="p-3 border">Konu</th>
                                    <th className="p-3 border">Mesaj</th>
                                    <th className="p-3 border">İletilme Tarihi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sections.map((section) => (
                                    <tr
                                        key={section.id}
                                        className="text-center cursor-pointer hover:bg-gray-50"
                                        onDoubleClick={() => setSelectedSection(section)}
                                    >
                                        <td className="p-3 border">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(section.id)}
                                                onChange={() => toggleCheckbox(section.id)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
                                        <td className="p-1 border">{section.name}</td>
                                        <td className="p-3 border">{section.email}</td>
                                        <td className="p-3 border">{section.phoneNumber}</td>
                                        <td className="p-3 border">{section.subject}</td>
                                        <td className="p-3 border truncate max-w-xs">{section.message}</td>
                                        <td className="p-3 border">
                                            {new Date(section.createdAt).toLocaleString("tr-TR")}
                                        </td>
                                    </tr>
                                ))}
                                {sections.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-4 text-center text-gray-400">
                                            Bize Ulaşın Kutusu Boştur.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedSection && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-semibold mb-4">Mesaj Detayları</h2>
                        <div className="space-y-2">
                            <p><strong>Ad Soyad:</strong> {selectedSection.name}</p>
                            <p><strong>E-Posta:</strong> {selectedSection.email}</p>
                            <p><strong>Telefon:</strong> {selectedSection.phoneNumber}</p>
                            <p><strong>Konu:</strong> {selectedSection.subject}</p>
                            <p><strong>Mesaj:</strong> {selectedSection.message}</p>
                            <p><strong>İletilme Tarihi:</strong> {selectedSection.createdAt}</p>
                        </div>
                        <div className="mt-6 text-right">
                            <button
                                onClick={closeModal}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showConfirm && (
                <ConfirmModal
                    message="Seçilen Mesajları Silmek İster Misin?"
                    onConfirm={confirmDelete}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </Layout>
    );
};

export default BizeUlasinYonetimi;
