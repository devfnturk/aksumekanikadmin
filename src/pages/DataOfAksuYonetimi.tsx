import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import Swal from 'sweetalert2';
import { useLoading } from '../contexts/LoadingContext';
import TextModalContent from '../components/TextModalContent';
import Modal from '../components/Modal';

type Section = {
  id: string;
  title: string;
  count: number;
  isActive: boolean;
  enTitle: string;
};

// ⚡ PERFORMANS İYİLEŞTİRMESİ #1: Form komponenti ayrıştırıldı - Parent re-render'dan izole
const DataForm = React.memo(({
  editId,
  onSubmit,
  initialValues,
}: {
  editId: string | null;
  onSubmit: (values: any) => Promise<void>;
  initialValues: { count: number; title: string; enTitle: string; isActive: boolean };
}) => {
  const [form, setForm] = useState(initialValues);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'isActive') {
      setForm(prev => ({ ...prev, [name]: value === 'true' }));
    } else if (name === 'count') {
      setForm(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmit(form);
  }, [form, onSubmit]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow">
      <div>
        <label className="block font-semibold mb-1">Sayı</label>
        <input
          type="number"
          name="count"
          value={form.count}
          onChange={handleChange}
          placeholder="Gösterilecek sıra giriniz"
          className="w-full border rounded-md p-2"
          autoComplete="off"
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Başlık</label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="Başlık giriniz"
          className="w-full border rounded-md p-2"
          autoComplete="off"
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">(En) Başlık</label>
        <input
          name="enTitle"
          value={form.enTitle}
          onChange={handleChange}
          placeholder="İngilizce Başlık giriniz"
          className="w-full border rounded-md p-2"
          autoComplete="off"
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Durum</label>
        <select
          name="isActive"
          value={form.isActive.toString()}
          onChange={handleChange}
          className="w-full border rounded-md p-2"
        >
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <button
          onClick={handleSubmit}
          className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
        >
          {editId ? 'Güncelle' : 'Kaydet'}
        </button>
      </div>
    </div>
  );
});

const DataOfAksuYonetimi: React.FC = () => {
  const { showLoading, hideLoading } = useLoading();
  const [sections, setSections] = useState<Section[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [modalChildren, setModalChildren] = useState<React.ReactNode | null>(null);

  // ⚡ Form initial values'u memoize et
  const [formInitialValues, setFormInitialValues] = useState({
    count: 0,
    title: '',
    enTitle: '',
    isActive: true,
  });

  // DÜZELTME: fetchSections fonksiyonu useCallback ile sarmalandı.
  const fetchSections = useCallback(async () => {
    showLoading();
    try {
      const response = await api.get('/data');
      const fetchedSections = response.data.map((section: any) => ({
        id: section.id,
        title: section.title,
        count: section.count,
        isActive: section.isActive,
        enTitle: section.enTitle,
      }));
      setSections(fetchedSections);
    } catch (error) {
      console.error('Error fetching sections:', error);
      Swal.fire({
        title: 'Hata!',
        text: 'Veriler alınırken hata oluştu.',
        icon: 'error',
        confirmButtonText: 'Tamam',
        buttonsStyling: false,
        customClass: {
          popup: 'rounded-xl shadow-lg',
          confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
        },
      });
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading]); // useCallback bağımlılıkları eklendi.

  // DÜZELTME: fetchSections, useEffect bağımlılık dizisine eklendi.
  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  // ⚡ Form submit handler'ı useCallback ile sar
  const handleFormSubmit = useCallback(async (values: any) => {
    const { count, title, enTitle, isActive } = values;

    if (!count || !title || !enTitle) {
      Swal.fire({
        title: 'Uyarı!',
        text: 'Lütfen tüm alanları doldurun.',
        icon: 'warning',
        confirmButtonText: 'Tamam',
        buttonsStyling: false,
        customClass: {
          popup: 'rounded-xl shadow-lg',
          confirmButton: 'bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600',
        },
      });
      return;
    }

    const result = await Swal.fire({
      title: editId ? 'Güncellemek istediğinize emin misiniz?' : 'Kaydetmek istediğinize emin misiniz?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: editId ? 'Evet, Güncelle' : 'Evet, Kaydet',
      cancelButtonText: 'Vazgeç',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-xl shadow-lg',
        confirmButton: 'bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mr-2',
        cancelButton: 'bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400',
      },
    });

    if (!result.isConfirmed) return;

    showLoading();

    const sectionData = {
      title,
      count: Number(count),
      enTitle,
      isActive,
    };
    try {
      if (editId !== null) {
        const updatedSection = { id: editId, ...sectionData };
        await api.put(`/data/${editId}`, sectionData);

        setSections((prev) =>
          prev.map((section) =>
            section.id === editId ? updatedSection : section
          )
        );

        Swal.fire({
          title: 'Başarılı!',
          text: 'İçerik başarıyla güncellendi.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          customClass: { popup: 'rounded-xl shadow-lg' },
        });

        setEditId(null);
      } else {
        const newSectionTemp = {...sectionData };
        const response = await api.post('/data', newSectionTemp);
        setSections((prev) => [...prev, { ...newSectionTemp, id: response.data.id }]);

        Swal.fire({
          title: 'Başarılı!',
          text: 'Yeni içerik başarıyla eklendi.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          customClass: { popup: 'rounded-xl shadow-lg' },
        });
      }

      setFormInitialValues({ count: 0, title: '', enTitle: '', isActive: false });
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error saving section:', error);
      Swal.fire({
        title: 'Hata!',
        text: 'İşlem sırasında bir hata oluştu.',
        icon: 'error',
        confirmButtonText: 'Tamam',
        buttonsStyling: false,
        customClass: {
          popup: 'rounded-xl shadow-lg',
          confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
        },
      });
    } finally {
      hideLoading();
    }
  }, [editId, showLoading, hideLoading]);

  const handleEdit = useCallback((section: Section) => {
    setFormInitialValues({
      count: section.count,
      title: section.title,
      enTitle: section.enTitle,
      isActive: section.isActive,
    });
    setEditId(section.id);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const result = await Swal.fire({
      title: 'Emin misiniz?',
      text: 'Bu içeriği silmek üzeresiniz!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Evet, Sil',
      cancelButtonText: 'Vazgeç',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-xl shadow-lg',
        confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mr-2',
        cancelButton: 'bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400',
      },
    });

    if (!result.isConfirmed) return;

    showLoading();
    try {
      await api.delete(`/data/${id}`);
      setSections((prev) => prev.filter((section) => section.id !== id));
      Swal.fire({
        title: 'Silindi!',
        text: 'İçerik başarıyla silindi.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        customClass: { popup: 'rounded-xl shadow-lg' },
      });
    } catch (error) {
      console.error('Error deleting section:', error);
      Swal.fire({
        title: 'Hata!',
        text: 'Silme işlemi başarısız oldu.',
        icon: 'error',
        confirmButtonText: 'Tamam',
        buttonsStyling: false,
        customClass: {
          popup: 'rounded-xl shadow-lg',
          confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
        },
      });
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading]);

  const handleToggleActive = useCallback(async (sectionId: string) => {
    const sectionToUpdate = sections.find((section) => section.id === sectionId);
    if (!sectionToUpdate) return;

    const result = await Swal.fire({
      title: sectionToUpdate.isActive
        ? 'İçeriği pasif etmek istediğinize emin misiniz?'
        : 'İçeriği aktif etmek istediğinize emin misiniz?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: sectionToUpdate.isActive ? 'Evet, Pasif Et' : 'Evet, Aktif Et',
      cancelButtonText: 'Vazgeç',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-xl shadow-lg',
        confirmButton: 'bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mr-2',
        cancelButton: 'bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400',
      },
    });

    if (!result.isConfirmed) return;

    showLoading();

    const updatedSection = {
      ...sectionToUpdate,
      isActive: !sectionToUpdate.isActive,
    };

    try {
      await api.put(`/data/${sectionId}`, updatedSection);
      setSections((prev) =>
        prev.map((section) =>
          section.id === sectionId ? updatedSection : section
        )
      );

      Swal.fire({
        title: 'Başarılı!',
        text: `İçerik ${updatedSection.isActive ? 'aktif' : 'pasif'} edildi.`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        customClass: { popup: 'rounded-xl shadow-lg' },
      });
    } catch (error) {
      console.error("Aktiflik güncellenirken hata:", error);
      Swal.fire({
        title: 'Hata!',
        text: 'Durum güncellenemedi.',
        icon: 'error',
        confirmButtonText: 'Tamam',
        buttonsStyling: false,
        customClass: {
          popup: 'rounded-xl shadow-lg',
          confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
        },
      });
    } finally {
      hideLoading();
    }
  }, [sections, showLoading, hideLoading]);

  const truncateText = useCallback((text: string, maxLength: number) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  }, []);


  const openTextModal = useCallback((content: string) => {
    setModalChildren(<TextModalContent title="Detaylı İçerik" content={content} />);
  }, []);


  const closeModal = useCallback(() => {
    setModalChildren(null);
  }, []);

  // ⚡ PERFORMANS İYİLEŞTİRMESİ: Row Component - Her satır memoize edildi
  const TableRowComponent = React.memo(({ section }: { section: Section }) => {
    return (
      <tr className="text-center">
        <td className="p-3 border">{section.count}</td>
        <td
          className="p-3 border hover:bg-gray-50 cursor-pointer"
          onDoubleClick={() => openTextModal(section.title)}
          title={section.title.length > 50 ? section.title : undefined}
        >
          {truncateText(section.title, 50)}
        </td>
        <td
          className="p-3 border hover:bg-gray-50 cursor-pointer"
          onDoubleClick={() => openTextModal(section.enTitle)}
          title={section.enTitle.length > 50 ? section.enTitle : undefined}
        >
          {truncateText(section.enTitle, 50)}
        </td>
        <td className="p-3 border">
          <span className={section.isActive ? 'text-green-600 font-semibold' : 'text-red-500'}>
            {section.isActive ? 'Aktif' : 'Pasif'}
          </span>
        </td>
        <td className="p-3 border space-x-2">
          <button
            onClick={() => handleToggleActive(section.id)}
            className={`${section.isActive ? 'bg-red-500' : 'bg-green-600'} text-white px-3 py-1 rounded hover:bg-opacity-80`}
          >
            {section.isActive ? 'Pasifleştir' : 'Aktifleştir'}
          </button>
          <button
            onClick={() => handleEdit(section)}
            className="bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500"
          >
            Düzenle
          </button>
          <button
            onClick={() => handleDelete(section.id)}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Sil
          </button>
        </td>
      </tr>
    );
  });

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Veri Yönetimi</h1>

        <div className="text-right">
          <button
            onClick={() => {
              setIsFormOpen(!isFormOpen);
              if (isFormOpen) {
                setFormInitialValues({ count: 0, title: '', enTitle: '', isActive: false });
                setEditId(null);
              }
            }}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
          >
            {isFormOpen ? 'Formu Gizle' : 'Yeni Ekle'}
          </button>
        </div>

        {isFormOpen && (
          <DataForm
            editId={editId}
            onSubmit={handleFormSubmit}
            initialValues={formInitialValues}
          />
        )}

        <div className="overflow-x-auto bg-white rounded-xl shadow">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border">Sayı</th>
                <th className="p-3 border">Başlık</th>
                <th className="p-3 border">(EN) Başlık</th>
                <th className="p-3 border">Durum</th>
                <th className="p-3 border">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <TableRowComponent key={section.id} section={section} />
              ))}
              {sections.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400">
                    Henüz içerik eklenmedi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalChildren !== null} onClose={closeModal}>
        {modalChildren}
      </Modal>
    </Layout>
  );
};

export default DataOfAksuYonetimi;
