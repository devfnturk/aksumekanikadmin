import React, { useState, useEffect, useCallback, memo } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import Swal from 'sweetalert2';
import { useLoading } from '../contexts/LoadingContext';

// --- Tipler ---
type Section = {
    id: number;
    name: string;
    email: string;
    phoneNumber: string;
    subject: string;
    message: string;
    createdAt: string;
};

// --- Alt Bileşenler (Performans için ayrıştırıldı) ---

// 1. Mesaj Detay Modalı
interface MessageDetailModalProps {
    section: Section | null;
    onClose: () => void;
}

const MessageDetailModal: React.FC<MessageDetailModalProps> = memo(({ section, onClose }) => {
    if (!section) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                <h2 className="text-xl font-semibold mb-4">Mesaj Detayları</h2>
                <div className="space-y-2 break-all">
                    <p><strong>Ad Soyad:</strong> {section.name}</p>
                    <p><strong>E-Posta:</strong> {section.email}</p>
                    <p><strong>Telefon:</strong> {section.phoneNumber}</p>
                    <p><strong>Konu:</strong> {section.subject}</p>
                    <p><strong>Mesaj:</strong> {section.message}</p>
                    <p><strong>İletilme Tarihi:</strong> {new Date(section.createdAt).toLocaleString("tr-TR")}</p>
                </div>
                <div className="mt-6 text-right">
                    <button onClick={onClose} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Kapat</button>
                </div>
            </div>
        </div>
    );
});
MessageDetailModal.displayName = "MessageDetailModal";

// 2. Mesaj Tablosu
interface MessagesTableProps {
    sections: Section[];
    selectedIds: number[];
    onRowDoubleClick: (section: Section) => void;
    onToggleCheckbox: (id: number) => void;
    onToggleAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MessagesTable: React.FC<MessagesTableProps> = memo(({ sections, selectedIds, onRowDoubleClick, onToggleCheckbox, onToggleAll }) => {
    return (
        <div className="overflow-x-auto bg-white rounded-xl shadow">
            <table className="min-w-full table-auto border-collapse">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-3 border">
                            <input type="checkbox" checked={sections.length > 0 && selectedIds.length === sections.length} onChange={onToggleAll} />
                        </th>
                        <th className="p-3 border">Ad Soyad</th>
                        <th className="p-3 border">E-posta</th>
                        <th className="p-3 border">Telefon</th>
                        <th className="p-3 border">Konu</th>
                        <th className="p-3 border">Mesaj</th>
                        <th className="p-3 border">İletilme Tarihi</th>
                    </tr>
                </thead>
                <tbody>
                    {sections.map((section) => (
                        <tr key={section.id} className="text-center cursor-pointer hover:bg-gray-50" onDoubleClick={() => onRowDoubleClick(section)}>
                            <td className="p-3 border">
                                <input type="checkbox" checked={selectedIds.includes(section.id)} onChange={() => onToggleCheckbox(section.id)} onClick={(e) => e.stopPropagation()} />
                            </td>
                            <td className="p-1 border">{section.name}</td>
                            <td className="p-3 border">{section.email}</td>
                            <td className="p-3 border">{section.phoneNumber}</td>
                            <td className="p-3 border">{section.subject}</td>
                            <td className="p-3 border truncate max-w-xs">{section.message}</td>
                            <td className="p-3 border">{new Date(section.createdAt).toLocaleString("tr-TR")}</td>
                        </tr>
                    ))}
                    {sections.length === 0 && (
                        <tr><td colSpan={7} className="p-4 text-center text-gray-400">Gelen kutusu boş.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
});
MessagesTable.displayName = "MessagesTable";


// --- Ana Bileşen ---
const BizeUlasinYonetimi: React.FC = () => {
    const [sections, setSections] = useState<Section[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [selectedSection, setSelectedSection] = useState<Section | null>(null);
    const { showLoading, hideLoading } = useLoading();

    const fetchMessages = useCallback(async () => {
        showLoading();
        try {
            const response = await api.get('/contact-us');
            setSections(response.data);
        } catch (error) {
            console.error('Veri getirme hatası:', error);
            Swal.fire('Hata', 'Veriler alınırken bir hata oluştu.', 'error');
        } finally {
            hideLoading();
        }
    }, [showLoading, hideLoading]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const confirmDelete = useCallback(async () => {
        showLoading();
        try {
            // OPTIMIZATION: Tüm silme isteklerini bir diziye atıp Promise.all ile aynı anda gönderiyoruz.
            const deletePromises = selectedIds.map(id => api.delete(`/contact-us/${id}`));
            await Promise.all(deletePromises);

            // Başarılı olursa, state'i tek seferde güncelliyoruz.
            setSections(prev => prev.filter(section => !selectedIds.includes(section.id)));
            setSelectedIds([]); // Seçimleri temizle
            return true; // Başarı durumunu döndür
        } catch (error) {
            console.error("Silme hatası:", error);
            Swal.fire("Hata", "Mesajlar silinirken bir hata oluştu.", "error");
            return false; // Hata durumunu döndür
        } finally {
            hideLoading();
        }
    }, [selectedIds, showLoading, hideLoading]);

    const handleDeleteClick = useCallback(async () => {
        if (selectedIds.length === 0) return;

        const result = await Swal.fire({
            title: 'Emin misiniz?',
            text: `${selectedIds.length} adet mesaj kalıcı olarak silinecek.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Evet, Sil',
            cancelButtonText: 'Vazgeç',
            customClass: { confirmButton: 'bg-red-600', /* ...diğer classlar */ },
        });

        if (result.isConfirmed) {
            const isSuccess = await confirmDelete(); // Silme işleminin sonucunu bekle
            if (isSuccess) {
                Swal.fire('Başarılı!', 'Seçilen mesajlar silindi.', 'success');
            }
        }
    }, [selectedIds, confirmDelete]);

    const toggleCheckbox = useCallback((id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }, []);

    const toggleAllCheckboxes = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedIds(e.target.checked ? sections.map(s => s.id) : []);
    }, [sections]);

    return (
        <Layout>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Bize Ulaşın Yönetimi</h1>
                    <button
                        onClick={handleDeleteClick}
                        disabled={selectedIds.length === 0}
                        className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        Seçilenleri Sil ({selectedIds.length})
                    </button>
                </div>

                <MessagesTable
                    sections={sections}
                    selectedIds={selectedIds}
                    onRowDoubleClick={setSelectedSection}
                    onToggleCheckbox={toggleCheckbox}
                    onToggleAll={toggleAllCheckboxes}
                />
            </div>

            <MessageDetailModal
                section={selectedSection}
                onClose={() => setSelectedSection(null)}
            />
        </Layout>
    );
};

export default BizeUlasinYonetimi;
