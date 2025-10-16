import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import { useFormik } from 'formik';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

import Modal from '../components/Modal';
import TextModalContent from '../components/TextModalContent';
import ImageModalContent from '../components/ImageModalContent';
import { useLoading } from '../contexts/LoadingContext';

// Tipler
type Section = {
  id: string;
  image?: { id: string; url: string; }[];
  imageUrls: string[];
  title: string;
  description: string;
  link: string;
  isActive: boolean;
  enTitle: string;
  enDescription: string;
  order:number;
};

// *** YENİ: Google Drive linklerini dönüştürmek için yardımcı fonksiyonlar ***

/**
 * Paylaşılan Google Drive linkini (örn: /file/d/.../view)
 * thumbnail linkine (örn: /thumbnail?id=...) dönüştürür.
 * @param {string} url - Dönüştürülecek Google Drive URL'si.
 * @returns {string} Dönüştürülmüş thumbnail URL'si veya orijinal URL.
 */
const convertToThumbnail = (url: string): string => {
  if (!url) return '';
  // Eğer link zaten istediğimiz formatta değilse işlem yap
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/d\/(.*?)\//); // ID'yi yakalamak için Regex
    if (match && match[1]) {
      const fileId = match[1];
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=s1920`;
    }
  }
  // Eğer link zaten thumbnail formatında veya başka bir linkse, olduğu gibi bırak
  return url;
};

/**
 * Thumbnail linkini tekrar kullanıcı dostu paylaşılan link formatına çevirir.
 * Bu, düzenleme formunda gösterim için kullanılır.
 * @param {string} url - Dönüştürülecek thumbnail URL'si.
 * @returns {string} Paylaşılabilir 'view' URL'si veya orijinal URL.
 */
const convertToViewLink = (url: string): string => {
  if (!url) return '';
  if (url.includes('drive.google.com/thumbnail?id=')) {
    try {
      const urlObject = new URL(url);
      const fileId = urlObject.searchParams.get('id');
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/view`;
      }
    } catch (error) {
      // Geçersiz URL durumunda orijinal URL'i döndür
      return url;
    }
  }
  return url;
};


const truncateText = (text: string | undefined, maxLength: number = 50): string => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

const BrandActivityAreasRow = React.memo(({ section, onToggle, onEdit, onDelete, onOpenTextModal, onOpenImageModal }: {
  section: Section;
  onToggle: (section: Section) => void;
  onEdit: (section: Section) => void;
  onDelete: (id: string) => void;
  onOpenTextModal: (content: string) => void;
  onOpenImageModal: (imageUrls: string[], startIndex: number) => void;
}) => {
  const imageUrls = section.imageUrls || [];

  return (
    <tr className="text-center">
      <td className="p-3 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-50">{section.order}</td>
      <td className="p-3 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-50" onDoubleClick={() => section.title && onOpenTextModal(section.title)}>{truncateText(section.title)}</td>
      <td className="p-3 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-50" onDoubleClick={() => section.enTitle && onOpenTextModal(section.enTitle)}>{truncateText(section.enTitle)}</td>
      <td className="p-3 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-50" onDoubleClick={() => section.description && onOpenTextModal(section.description)}>{truncateText(section.description)}</td>
      <td className="p-3 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-50" onDoubleClick={() => section.enDescription && onOpenTextModal(section.enDescription)}>{truncateText(section.enDescription)}</td>
      <td className="p-3 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-50">
        <span className={section.isActive ? 'text-green-600 font-semibold' : 'text-red-500'}>
          {section.isActive ? 'Aktif' : 'Pasif'}
        </span>
      </td>
      <td className="p-3 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-50">
        {imageUrls.length > 0 ? (
          <div className="relative group inline-block">
            <img src={imageUrls[0]} loading="lazy" alt="banner" className="h-20 w-20 object-cover rounded-md cursor-pointer"
              onClick={() => onOpenImageModal(imageUrls, 0)} />
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => onOpenImageModal(imageUrls, 0)}>
              Büyüt ({imageUrls.length})
            </div>
          </div>
        ) : (
          <span>Görsel Yok</span>
        )}
      </td>
      <td className="p-3 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-50">
        <button onClick={() => onToggle(section)} className={`${section.isActive ? 'bg-red-500' : 'bg-green-500'} text-white px-3 py-1 rounded hover:opacity-90`}>
          {section.isActive ? 'Pasifleştir' : 'Aktifleştir'}
        </button>
        <button onClick={() => onEdit(section)} className="bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500">Düzenle</button>
        <button onClick={() => onDelete(section.id)} className="bg-red-600 px-3 py-1 rounded text-white hover:bg-red-700">Sil</button>
      </td>
    </tr>
  );
});


const BrandActivityMarkaYonetimi: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [modalChildren, setModalChildren] = useState<React.ReactNode | null>(null);

  const { showLoading, hideLoading } = useLoading();

  const fetchSections = useCallback(async () => {
    showLoading();
    try {
      const res = await api.get('/field-of-activities');
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

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const formik = useFormik({
    initialValues: {
      title: '', description: '', link: '', isActive: true,
      enTitle: '', enDescription: '', imageUrl: '',order:0
    },
    onSubmit: async (values, { resetForm }) => {
      const result = await Swal.fire({
        title: editId ? 'Faaliyet Alanı güncellensin mi?' : 'Yeni Faaliyet Alanı eklensin mi?',
        icon: 'warning', showCancelButton: true, confirmButtonText: 'Evet', cancelButtonText: 'Hayır',
        buttonsStyling: false,
        customClass: {
          actions: 'flex justify-center gap-4',
          confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
          cancelButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
        },
      });

      if (result.isConfirmed) {
        showLoading();
        try {
          // *** GÜNCELLENDİ: URL'yi göndermeden önce thumbnail formatına çeviriyoruz. ***
          const thumbnailUrl = convertToThumbnail(values.imageUrl);

          const payload = {
            title: values.title,
            description: values.description,
            link: values.link,
            isActive: values.isActive,
            enTitle: values.enTitle,
            enDescription: values.enDescription,
            imageUrls: thumbnailUrl ? [thumbnailUrl] : [], // Dönüştürülmüş URL'yi diziye koy
            order:values.order,
          };

          if (editId) {
            await api.put(`/field-of-activities/${editId}`, payload);
          } else {
            await api.post('/field-of-activities', payload);
          }

          Swal.fire({
            title: 'Başarılı!',
            text: editId ? 'Faaliyet Alanı güncellendi.' : 'Faaliyet Alanı eklendi.',
            icon: 'success',
            customClass: { confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700' },
          });

          fetchSections();
          resetForm();
          setEditId(null);
          setIsFormOpen(false);
        } catch (err: any) {
          console.error(err);
          Swal.fire({
            title: 'Hata!',
            text: err.response?.data?.message || 'Bir hata oluştu.',
            icon: 'error',
            customClass: { confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700' },
          });
        } finally {
          hideLoading();
        }
      }
    },
  });

  const handleEdit = useCallback((section: Section) => {
    formik.setValues({
      title: section.title || '',
      description: section.description || '',
      link: section.link || '',
      isActive: section.isActive,
      enTitle: section.enTitle || '',
      enDescription: section.enDescription || '',
      // *** GÜNCELLENDİ: Thumbnail URL'sini forma koyarken kullanıcı dostu view linkine çeviriyoruz. ***
      imageUrl: convertToViewLink(section.imageUrls?.[0] || ''),
      order:section.order,
    });
    setEditId(section.id);
    setIsFormOpen(true);
    window.scrollTo(0, 0);
  }, [formik]);

  // ... (handleDelete, toggleActiveStatus ve diğer fonksiyonlar aynı kalabilir)
  const handleDelete = useCallback(async (id: string) => {
    const result = await Swal.fire({
      title: 'Faaliyet Alanı silinsin mi?', text: 'Bu işlem geri alınamaz!',
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Evet', cancelButtonText: 'Hayır',
      buttonsStyling: false,
      customClass: {
        actions: 'flex justify-center gap-4',
        confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        cancelButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
      },
    });

    if (result.isConfirmed) {
      showLoading();
      try {
        await api.delete(`/field-of-activities/${id}`);
        Swal.fire({
          title: 'Silindi!', text: 'Faaliyet Alanı başarıyla silindi.', icon: 'success', showConfirmButton: true,
          customClass: { actions: 'flex justify-center gap-4', confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700' },
        });
        fetchSections();
      } catch (err: any) {
        console.error(err);
        Swal.fire({
          title: 'Hata!', text: err.response?.data?.message || 'Bir hata oluştu.', icon: 'error', showConfirmButton: true,
          customClass: { actions: 'flex justify-center gap-4', confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700' },
        });
      } finally {
        hideLoading();
      }
    }
  }, [fetchSections, showLoading, hideLoading]);

  const toggleActiveStatus = useCallback(async (section: Section) => {
    const result = await Swal.fire({
      title: section.isActive ? 'Pasifleştirilsin mi?' : 'Aktifleştirilsin mi?',
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Evet', cancelButtonText: 'Hayır',
      buttonsStyling: false,
      customClass: {
        actions: 'flex justify-center gap-4',
        confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        cancelButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
      },
    });

    if (result.isConfirmed) {
      showLoading();
      try {
        const payload = {
          ...section,
          isActive: !section.isActive,
        };
        await api.put(`/field-of-activities/${section.id}`, payload);
        Swal.fire({
          title: 'Başarılı!', text: 'Faaliyet Alanı durumu güncellendi.', icon: 'success', showConfirmButton: true,
          customClass: { actions: 'flex justify-center gap-4', confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700' },
        });
        fetchSections();
      } catch (err: any) {
        console.error(err);
        Swal.fire({
          title: 'Hata!', text: err.response?.data?.message || 'Bir hata oluştu.', icon: 'error', showConfirmButton: true,
          customClass: { actions: 'flex justify-center gap-4', confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700' },
        });
      } finally {
        hideLoading();
      }
    }
  }, [fetchSections, showLoading, hideLoading]);

  const openTextModal = useCallback((content: string) => {
    setModalChildren(<TextModalContent title="Detaylı İçerik" content={content} />);
  }, []);

  const openImageModal = useCallback((imageUrls: string[], startIndex: number) => {
    setModalChildren(
      <ImageModalContent
        title="Görseli Büyüt"
        imageUrls={imageUrls}
        startIndex={startIndex}
      />
    );
  }, []);

  const closeModal = useCallback(() => {
    setModalChildren(null);
  }, []);


  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Faaliyet Alanı Yönetimi</h1>
          <button
            onClick={() => {
              formik.resetForm();
              setEditId(null);
              setIsFormOpen((prev) => !prev);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {isFormOpen ? 'Formu Gizle' : 'Yeni Faaliyet Alanı Ekle'}
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={formik.handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="number" name="order" value={formik.values.order} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Sıra" />
              <input type="text" name="title" value={formik.values.title} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Başlık" />
              <textarea name="description" value={formik.values.description} onChange={formik.handleChange} className="w-full border rounded-md p-2 md:col-span-2" placeholder="Açıklama" />
              <input type="text" name="enTitle" value={formik.values.enTitle} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Başlık (EN)" />
              <textarea name="enDescription" value={formik.values.enDescription} onChange={formik.handleChange} className="w-full border rounded-md p-2 md:col-span-2" placeholder="Açıklama (EN)" />
              <input type="text" name="imageUrl" value={formik.values.imageUrl} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Google Drive Görsel URL" />
              <select name="isActive" value={formik.values.isActive.toString()} onChange={(e) => formik.setFieldValue('isActive', e.target.value === 'true')} className="w-full border rounded-md p-2">
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </div>
            {formik.values.imageUrl && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700">Görsel Önizlemesi:</p>
                {/* Önizlemeyi de thumbnail üzerinden yapalım ki hızlı yüklensin */}
                <img src={convertToThumbnail(formik.values.imageUrl)} alt="Yüklenen görsel" className="h-32 mt-2 rounded object-cover" />
              </div>
            )}
            <div className="text-right">
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                {editId ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="table-auto border-collapse text-sm w-full">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 border text-left whitespace-nowrap">Sıra</th>
                <th className="p-3 border text-left whitespace-nowrap">Başlık</th><th className="p-3 border text-left whitespace-nowrap">(EN) Başlık</th>
                <th className="p-3 border text-left whitespace-nowrap">Açıklama</th><th className="p-3 border text-left whitespace-nowrap">(EN) Açıklama</th>
                <th className="p-3 border text-left whitespace-nowrap">Durum</th>
                <th className="p-3 border text-left whitespace-nowrap">Görsel</th><th className="p-3 border text-left whitespace-nowrap">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <BrandActivityAreasRow key={section.id} section={section} onEdit={handleEdit} onDelete={handleDelete}
                  onToggle={toggleActiveStatus} onOpenTextModal={openTextModal} onOpenImageModal={openImageModal} />
              ))}
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

export default BrandActivityMarkaYonetimi;

