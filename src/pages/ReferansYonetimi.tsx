import React, { useState, useEffect, useCallback } from 'react';
import { useFormik } from 'formik';
import Layout from '../components/Layout';
import api from '../api';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { useLoading } from '../contexts/LoadingContext';
import Modal from '../components/Modal';
import TextModalContent from '../components/TextModalContent';
import ImageModalContent from '../components/ImageModalContent';

// Section (Bölüm) verisi için tip tanımı
type Section = {
  id: string;
  title: string;
  link: string;
  isActive: boolean;
  imageUrls: string[];
};

/**
 * Google Drive dosya URL'sini küçük resim (thumbnail) URL'sine dönüştürür.
 * @param {string} url - Orijinal Google Drive URL'si.
 * @returns {string} Dönüştürülmüş thumbnail URL'si veya orijinal URL.
 */
const convertToThumbnail = (url: string): string => {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/d\/(.*?)\//);
    if (match && match[1]) {
      const fileId = match[1];
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=s1920`;
    }
  }
  return url;
};

// --- YENİ ---
// Form komponenti, gereksiz prop'lardan arındırıldı ve daha temiz hale getirildi.
const ReferenceForm = React.memo(({
  editId,
  onSubmit,
  initialValues,
}: {
  editId: string | null;
  onSubmit: (values: any) => Promise<void>;
  initialValues: { title: string; link: string; isActive: boolean; imageUrl: string };
}) => {
  const formik = useFormik({
    initialValues,
    enableReinitialize: true, // Düzenleme modunda formun yeniden başlatılmasını sağlar
    onSubmit: async (values, { resetForm }) => {
      await onSubmit(values);
      resetForm();
    },
  });

  return (
    <form
      onSubmit={formik.handleSubmit}
      className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl shadow"
    >
      <div>
        <label className="block font-semibold mb-1">Başlık</label>
        <input
          name="title"
          value={formik.values.title}
          onChange={formik.handleChange}
          className="w-full border rounded-md p-2"
          autoComplete="off"
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Link</label>
        <input
          name="link"
          value={formik.values.link}
          onChange={formik.handleChange}
          className="w-full border rounded-md p-2"
          autoComplete="off"
        />
      </div>
      <div>
        <label className="block font-semibold mb-1">Durum</label>
        <select
          name="isActive"
          value={formik.values.isActive.toString()}
          onChange={(e) => formik.setFieldValue('isActive', e.target.value === 'true')}
          className="w-full border rounded-md p-2"
        >
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="block font-semibold mb-1">Resim URL</label>
        {/* DÜZELTME: Formik state'i (imageUrl) ile input value'su eşleştirildi. */}
        <input
          type="text"
          name="imageUrl"
          value={formik.values.imageUrl}
          onChange={formik.handleChange}
          className="w-full border rounded-md p-2"
          placeholder="Google Drive Görsel URL"
        />
      </div>
      {formik.values.imageUrl && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700">Görsel Önizlemesi:</p>
          {/* Önizlemeyi de thumbnail üzerinden yapalım ki hızlı yüklensin */}
          <img src={convertToThumbnail(formik.values.imageUrl)} alt="Yüklenen görsel" className="h-32 mt-2 rounded object-cover" />
        </div>
      )}
      <div className="md:col-span-2">
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          {editId ? 'Güncelle' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
});

const ReferansYonetimi: React.FC = () => {
  const { showLoading, hideLoading } = useLoading();
  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [modalChildren, setModalChildren] = useState<React.ReactNode | null>(null);

  // --- DÜZELTME ---
  // Formun başlangıç değerleri, API'ye gönderilecek veriyle tutarlı hale getirildi.
  const [formInitialValues, setFormInitialValues] = useState({
    title: '',
    link: '',
    isActive: true,
    imageUrl: '',
  });

  // Verileri API'den çeken fonksiyon
  const fetchSections = useCallback(async () => {
    showLoading();
    try {
      const res = await api.get('/references');
      // Gelen veriyi, bileşenin kullanacağı formata dönüştür
      const normalizedData = res.data.map((section: any) => ({
        ...section,
        imageUrls: section.image ? section.image.map((img: { url: string }) => img.url) : [],
      }));
      setSections(normalizedData);
    } catch (err: any) {
      console.error('Veri çekme hatası', err);
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading]);

  // Bileşen yüklendiğinde verileri çek
  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  // --- DÜZELTME ---
  // Form gönderme fonksiyonu baştan yazıldı.
  // 1. API endpoint'i `/references` olarak düzeltildi.
  // 2. Payload, form alanlarıyla tutarlı hale getirildi.
  // 3. Gereksiz bağımlılıklar (sections, imageBase64) kaldırıldı.
  const handleFormSubmit = useCallback(async (values: any) => {
    try {
      const confirmed = await Swal.fire({
        title: editId ? 'Güncellemek istediğinize emin misiniz?' : 'Eklemek istediğinize emin misiniz?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Evet',
        cancelButtonText: 'Hayır',
        customClass: {
          actions: 'flex justify-center gap-4',
          confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
          cancelButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
        },
      });

      if (!confirmed.isConfirmed) return;

      showLoading();

      // Google Drive linkini thumbnail'e çevir
      const thumbnailUrl = convertToThumbnail(values.imageUrl);

      // API'ye gönderilecek veriyi hazırla
      const payload = {
        title: values.title,
        link: values.link,
        isActive: values.isActive,
        imageUrls: thumbnailUrl ? [thumbnailUrl] : [], // URL varsa diziye ekle
      };

      if (editId) {
        await api.put(`/references/${editId}`, payload);
      } else {
        await api.post('/references', payload);
      }

      Swal.fire({
        title: 'Başarılı!',
        text: editId ? 'Referans başarıyla güncellendi.' : 'Referans başarıyla eklendi.',
        icon: 'success',
        confirmButtonText: 'Tamam',
      });

      await fetchSections(); // Listeyi güncelle
      setEditId(null);
      setIsFormOpen(false); // Formu kapat

    } catch (err) {
      console.error('Form gönderme hatası:', err);
      Swal.fire('Hata!', 'İşlem sırasında bir hata oluştu.', 'error');
    } finally {
      hideLoading();
    }
  }, [editId, showLoading, hideLoading, fetchSections]);

  // --- DÜZELTME ---
  // Düzenleme fonksiyonu, formun başlangıç değerlerini doğru şekilde ayarlıyor.
  // `isActive` ve `imageUrl` alanları artık mevcut veriden doğru alınıyor.
  const handleEdit = useCallback((section: Section) => {
    setFormInitialValues({
      title: section.title,
      link: section.link,
      isActive: section.isActive,
      imageUrl: section.imageUrls?.[0] || '', // Varsa ilk resmi al, yoksa boş bırak
    });
    setEditId(section.id);
    setIsFormOpen(true);
  }, []);

  // Referans silme fonksiyonu
  const handleDelete = useCallback(async (id: string) => {
    try {
      const confirmed = await Swal.fire({
        title: 'Silmek istediğinize emin misiniz?',
        text: "Bu işlem geri alınamaz!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Evet, Sil',
        cancelButtonText: 'Hayır',
        customClass: {
          actions: 'flex justify-center gap-4',
          confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
          cancelButton: 'bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500',
        },
      });

      if (!confirmed.isConfirmed) return;

      showLoading();
      await api.delete(`/references/${id}`);
      await fetchSections(); // Listeyi yenile
      Swal.fire('Silindi!', 'Referans başarıyla silindi.', 'success');

    } catch (err) {
      console.error('Silme hatası:', err);
      Swal.fire('Hata!', 'Silme işlemi sırasında bir hata oluştu.', 'error');
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, fetchSections]);

  // --- OPTİMİZASYON ---
  // Durum değiştirme fonksiyonu, gereksiz API çağrısını kaldırarak optimize edildi.
  // Artık mevcut section verisini bularak payload oluşturuyor.
  const handleToggleActive = useCallback(async (id: string, newState: boolean) => {
    const sectionToUpdate = sections.find(s => s.id === id);
    if (!sectionToUpdate) return;

    try {
      const confirmed = await Swal.fire({
        title: `Referansı ${newState ? 'aktif' : 'pasif'} yapmak istediğinize emin misiniz?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Evet',
        cancelButtonText: 'Hayır',
      });

      if (!confirmed.isConfirmed) return;

      showLoading();

      const payload = {
        title: sectionToUpdate.title,
        link: sectionToUpdate.link,
        isActive: newState, // Sadece durumu değiştir
        imageUrls: sectionToUpdate.imageUrls
      };

      await api.put(`/references/${id}`, payload);
      await fetchSections(); // Listeyi yenile
      Swal.fire('Başarılı!', `Referans durumu başarıyla güncellendi.`, 'success');

    } catch (err) {
      console.error('Durum güncelleme hatası:', err);
      Swal.fire('Hata!', 'Durum güncellenirken bir sorun oluştu.', 'error');
    } finally {
      hideLoading();
    }
  }, [sections, showLoading, hideLoading, fetchSections]);

  const truncateText = useCallback((text: string, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }, []);

  const openTextModal = useCallback((content: string) => {
    setModalChildren(<TextModalContent title="Detaylı İçerik" content={content} />);
  }, []);

  const openImageModal = useCallback((imageUrls: string[]) => {
    setModalChildren(<ImageModalContent title="Görsel" imageUrls={imageUrls} startIndex={0} />);
  }, []);

  const closeModal = useCallback(() => setModalChildren(null), []);

  // Tablo satırı için ayrı ve memoize edilmiş bileşen
  const TableRowComponent = React.memo(({ section }: { section: Section }) => {
    const [imgSrc, setImgSrc] = useState<string>('');

    // --- DÜZELTME ---
    // Görsel URL'si değiştiğinde, küçük resmi (thumbnail) oluşturan ve state'i güncelleyen useEffect eklendi.
    useEffect(() => {
      const thumbnailUrl = convertToThumbnail(section.imageUrls?.[0] || '');
      setImgSrc(thumbnailUrl);
    }, [section.imageUrls]);

    return (
      <tr className="text-center">
        <td className="p-3 border hover:bg-gray-50" title={section.title}
        onDoubleClick={() => section.title && openTextModal(section.title)}>{truncateText(section.title, 50)}</td>
        <td className="p-3 border hover:bg-gray-50" title={section.link}
        onDoubleClick={() => section.link && openTextModal(section.link)}>{truncateText(section.link, 50)}</td>
        <td className="p-3 border">
          {imgSrc ? (
            <div
              className="relative w-16 h-10 mx-auto rounded overflow-hidden group cursor-pointer"
              onClick={() => openImageModal(section.imageUrls)}
            >
              <img src={imgSrc} alt={section.title} className="w-full h-full object-cover" loading="lazy" />
            </div>
          ) : (
            <div className="w-16 h-10 mx-auto bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">Görsel Yok</div>
          )}
        </td>
        <td className="p-3 border">
          <span className={section.isActive ? 'text-green-600 font-semibold' : 'text-red-500'}>
            {section.isActive ? 'Aktif' : 'Pasif'}
          </span>
        </td>
        <td className="p-3 border space-x-2">
          <button onClick={() => handleToggleActive(section.id, !section.isActive)} className={`${section.isActive ? 'bg-red-500' : 'bg-green-500'} text-white px-3 py-1 rounded hover:opacity-90`}>
            {section.isActive ? 'Pasifleştir' : 'Aktifleştir'}
          </button>
          <button onClick={() => handleEdit(section)} className="bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500">Düzenle</button>
          <button onClick={() => handleDelete(section.id)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Sil</button>
        </td>
      </tr>
    );
  });

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Referans Yönetimi</h1>
        <div className="text-right">
          <button
            onClick={() => {
              // --- DÜZELTME ---
              // Form açma/kapama mantığı basitleştirildi.
              // "Yeni Ekle" butonuna basıldığında form sıfırlanıyor.
              if (!isFormOpen) {
                setEditId(null);
                setFormInitialValues({ title: '', link: '', isActive: true, imageUrl: '' });
              }
              setIsFormOpen(!isFormOpen);
            }}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
          >
            {isFormOpen ? 'Formu Gizle' : 'Yeni Ekle'}
          </button>
        </div>

        {isFormOpen && (
          <ReferenceForm
            editId={editId}
            onSubmit={handleFormSubmit}
            initialValues={formInitialValues}
          />
        )}

        <div className="overflow-x-auto bg-white rounded-xl shadow">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border">Başlık</th>
                <th className="p-3 border">Link</th>
                <th className="p-3 border">Resim</th>
                <th className="p-3 border">Durum</th>
                <th className="p-3 border">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sections.map(section => (
                <TableRowComponent key={section.id} section={section} />
              ))}
              {sections.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400">Henüz içerik eklenmedi.</td>
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

export default ReferansYonetimi;
