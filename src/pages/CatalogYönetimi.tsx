import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import pako from 'pako';
import { useFormik } from 'formik';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { useLoading } from '../contexts/LoadingContext';
import Modal from '../components/Modal';
import TextModalContent from '../components/TextModalContent';
import ImageModalContent from '../components/ImageModalContent';

type Section = {
  id: string;
  image?: { imageData: string }[];
  title: string;
  link: string;
  isActive: boolean;
};

// ⚡ PERFORMANS İYİLEŞTİRMESİ #1: Image Cache
const imageCache = new Map<string, string>();

export function decodeImage(imageData: string): string {
  if (imageCache.has(imageData)) {
    return imageCache.get(imageData)!;
  }

  try {
    const binary = atob(imageData);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    const decompressed = pako.inflate(bytes);
    let result = '';
    for (let i = 0; i < decompressed.length; i += 0x8000) {
      result += String.fromCharCode.apply(
        null,
        Array.from(decompressed.subarray(i, i + 0x8000))
      );
    }
    const decoded = `data:image/jpeg;base64,${btoa(result)}`;
    imageCache.set(imageData, decoded);
    return decoded;
  } catch (err) {
    console.error('Decode error:', err);
    return '';
  }
}

// ⚡ PERFORMANS İYİLEŞTİRMESİ #2: Form Component - İzole edildi
const CatalogForm = React.memo(({
  editId,
  onSubmit,
  initialValues,
  onImageUpload,
  imageBase64
}: {
  editId: string | null;
  onSubmit: (values: any) => Promise<void>;
  initialValues: { title: string; link: string; isActive: boolean };
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  imageBase64: string;
}) => {
  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    onSubmit: async (values, { resetForm }) => {
      await onSubmit(values);
      resetForm();
    },
  });

  return (
    <form onSubmit={formik.handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          name="title"
          value={formik.values.title}
          onChange={formik.handleChange}
          className="w-full border rounded-md p-2"
          placeholder="Başlık"
          autoComplete="off"
        />
        <input
          type="text"
          name="link"
          value={formik.values.link}
          onChange={formik.handleChange}
          className="w-full border rounded-md p-2"
          placeholder="Link"
          autoComplete="off"
        />
        <select
          name="isActive"
          value={formik.values.isActive.toString()}
          onChange={(e) => formik.setFieldValue('isActive', e.target.value === 'true')}
          className="w-full border rounded-md p-2"
        >
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>
        <input
          type="file"
          name="image"
          accept="image/*"
          onChange={onImageUpload}
          className="md:col-span-2"
        />
        {imageBase64 && (
          <img
            src={imageBase64}
            alt="Yüklenen görsel"
            className="h-32 mt-2 rounded object-cover"
            loading="lazy"
          />
        )}
      </div>

      <div className="text-right">
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

const CatalogYönetimi: React.FC = () => {
  const { showLoading, hideLoading } = useLoading();
  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [modalChildren, setModalChildren] = useState<React.ReactNode | null>(null);

  // ⚡ Form initial values'u memoize et
  const [formInitialValues, setFormInitialValues] = useState({
    title: '',
    link: '',
    isActive: true,
  });

  const fetchSections = useCallback(async () => {
    showLoading();
    try {
      const res = await api.get('/catalogs');
      setSections(res.data);

      // ⚡ Görselleri arka planda cache'e yükle
      setTimeout(() => {
        res.data.forEach((section: Section) => {
          if (section.image && section.image[0]?.imageData) {
            decodeImage(section.image[0].imageData);
          }
        });
      }, 100);
    } catch (err) {
      console.error('Veri çekme hatası', err);
      Swal.fire('Hata!', 'Veriler alınırken hata oluştu.', 'error');
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const dataURLToFile = useCallback((dataUrl: string) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], 'image.jpg', { type: mime });
  }, []);

  // ⚡ Form submit handler'ı useCallback ile sar
  const handleFormSubmit = useCallback(async (values: any) => {
    const result = await Swal.fire({
      title: editId ? 'Katalog güncellensin mi?' : 'Yeni katalog eklensin mi?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Evet',
      cancelButtonText: 'Hayır',
      buttonsStyling: false,
      customClass: {
        actions: 'flex justify-center gap-4',
        confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        cancelButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
      },
    });

    if (!result.isConfirmed) return;

    showLoading();

    try {
      const formData = new FormData();
      const requestObject = {
        title: values.title,
        link: values.link,
        isActive: values.isActive,
      };
      formData.append('request', new Blob([JSON.stringify(requestObject)], { type: 'application/json' }));
      if (imageBase64) formData.append('files', dataURLToFile(imageBase64));

      if (editId) {
        await api.put(`/catalogs/${editId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/catalogs', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      Swal.fire({
        title: 'Başarılı!',
        text: editId ? 'Katalog güncellendi.' : 'Katalog eklendi.',
        icon: 'success',
        showConfirmButton: true,
        customClass: {
          actions: 'flex justify-center gap-4',
          confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        },
      });

      fetchSections();
      setFormInitialValues({ title: '', link: '', isActive: true });
      setImageBase64('');
      setEditId(null);
      setIsFormOpen(false);
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: 'Hata!',
        text: 'İşlem sırasında bir hata oluştu.',
        icon: 'error',
        showConfirmButton: true,
        customClass: {
          actions: 'flex justify-center gap-4',
          confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        },
      });
    } finally {
      hideLoading();
    }
  }, [editId, imageBase64, dataURLToFile, showLoading, hideLoading, fetchSections]);

  const handleEdit = useCallback((section: Section) => {
    setFormInitialValues({
      title: section.title || '',
      link: section.link || '',
      isActive: section.isActive,
    });
    setImageBase64(section.image?.[0]?.imageData ? decodeImage(section.image[0].imageData) : '');
    setEditId(section.id);
    setIsFormOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const result = await Swal.fire({
      title: 'Katalog silinsin mi?',
      text: 'Bu işlem geri alınamaz!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Evet',
      cancelButtonText: 'Hayır',
      buttonsStyling: false,
      customClass: {
        actions: 'flex justify-center gap-4',
        confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        cancelButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
      },
    });

    if (!result.isConfirmed) return;

    showLoading();
    try {
      await api.delete(`/catalogs/${id}`);
      Swal.fire({
        title: 'Silindi!',
        text: 'Katalog başarıyla silindi.',
        icon: 'success',
        showConfirmButton: true,
        customClass: {
          actions: 'flex justify-center gap-4',
          confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        },
      });
      fetchSections();
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: 'Hata!',
        text: 'Silme işlemi başarısız oldu.',
        icon: 'error',
        showConfirmButton: true,
        customClass: {
          actions: 'flex justify-center gap-4',
          confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        },
      });
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, fetchSections]);

  const toggleActiveStatus = useCallback(async (section: Section) => {
    const result = await Swal.fire({
      title: section.isActive ? 'Pasifleştirilsin mi?' : 'Aktifleştirilsin mi?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Evet',
      cancelButtonText: 'Hayır',
      buttonsStyling: false,
      customClass: {
        actions: 'flex justify-center gap-4',
        confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        cancelButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
      },
    });

    if (!result.isConfirmed) return;

    showLoading();

    try {
      const formData = new FormData();

      const requestObject = {
        title: section.title,
        link: section.link,
        isActive: !section.isActive,
      };

      formData.append('request', new Blob([JSON.stringify(requestObject)], { type: 'application/json' }));
      if (section.image?.[0]?.imageData) {
        const file = dataURLToFile(decodeImage(section.image[0].imageData));
        formData.append('files', file);
      } else {
        formData.append('files', new Blob([]));
      }

      await api.put(`/catalogs/${section.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Swal.fire({
        title: 'Başarılı!',
        text: 'Katalog güncellendi.',
        icon: 'success',
        showConfirmButton: true,
        customClass: {
          actions: 'flex justify-center gap-4',
          confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        },
      });
      fetchSections();
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: 'Hata!',
        text: 'Durum güncellenemedi.',
        icon: 'error',
        showConfirmButton: true,
        customClass: {
          actions: 'flex justify-center gap-4',
          confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        },
      });
    } finally {
      hideLoading();
    }
  }, [dataURLToFile, showLoading, hideLoading, fetchSections]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageBase64(reader.result as string);
      reader.readAsDataURL(file);
    }
  }, []);
  
  const openTextModal = useCallback((content: string) => {
    setModalChildren(<TextModalContent title="Detaylı İçerik" content={content} />);
  }, []);

  // ✅ HATA DÜZELTİLDİ: Bu fonksiyon artık tek bir görsel URL'si alıyor.
  const openImageModal = useCallback((imageUrl: string) => {
    if (!imageUrl) return;

    setModalChildren(
      <ImageModalContent
        title="Proje Görselleri"
        imageUrls={[imageUrl]} // Modal'a tek elemanlı bir dizi olarak gönderiliyor
        startIndex={0}
      />
    );
  }, []);


  const closeModal = useCallback(() => {
    setModalChildren(null);
  }, []);

  const truncateText = useCallback((text: string, maxLength: number) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  }, []);

  // ⚡ PERFORMANS İYİLEŞTİRMESİ: Row Component
  const TableRowComponent = React.memo(({
    section,
    onOpenTextModal,
    onOpenImageModal,
    onToggleActive,
    onEdit,
    onDelete,
    onTruncate
  }: {
    section: Section;
    onOpenTextModal: (content: string) => void;
    // ✅ HATA DÜZELTİLDİ: Prop tipi artık tek bir string bekliyor.
    onOpenImageModal: (imageUrl: string) => void;
    onToggleActive: (section: Section) => void;
    onEdit: (section: Section) => void;
    onDelete: (id: string) => void;
    onTruncate: (text: string, maxLength: number) => string;
  }) => {
    const [imgSrc, setImgSrc] = useState<string>('');

    useEffect(() => {
      const imageObj = Array.isArray(section.image) ? section.image[0] : null;
      const encoded = imageObj?.imageData;

      if (encoded) {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            setImgSrc(decodeImage(encoded));
          });
        } else {
          setTimeout(() => {
            setImgSrc(decodeImage(encoded));
          }, 0);
        }
      }
    }, [section]);

    return (
      <tr className="text-center">
        <td
          className="p-3 border hover:bg-gray-50 cursor-pointer"
          onDoubleClick={() => onOpenTextModal(section.title)}
        >
          {onTruncate(section.title, 50)}
        </td>
        <td
          className="p-3 border hover:bg-gray-50 cursor-pointer"
          onDoubleClick={() => onOpenTextModal(section.link)}
        >
          {onTruncate(section.link, 50)}
        </td>
        <td className="p-3 border">
          <span className={section.isActive ? 'text-green-600 font-semibold' : 'text-red-500'}>
            {section.isActive ? 'Aktif' : 'Pasif'}
          </span>
        </td>
        <td className="p-3 border">
          {imgSrc ? (
            <div
              className="relative w-16 h-10 mx-auto rounded overflow-hidden group cursor-pointer"
              // ✅ HATA DÜZELTİLDİ: Fonksiyon artık doğru argümanla çağrılıyor.
              onClick={() => onOpenImageModal(imgSrc)}
            >
              <img
                src={imgSrc}
                alt="Katalog görseli"
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <span className="text-white text-xs font-semibold">Büyüt</span>
              </div>
            </div>
          ) : (
            <div className="w-16 h-10 mx-auto bg-gray-200 animate-pulse rounded"></div>
          )}
        </td>
        <td className="p-3 border space-x-2">
          <button
            onClick={() => onToggleActive(section)}
            className={`${section.isActive ? 'bg-red-500' : 'bg-green-500'} text-white px-3 py-1 rounded hover:opacity-90`}
          >
            {section.isActive ? 'Pasifleştir' : 'Aktifleştir'}
          </button>
          <button
            onClick={() => onEdit(section)}
            className="bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500"
          >
            Düzenle
          </button>
          <button
            onClick={() => onDelete(section.id)}
            className="bg-red-600 px-3 py-1 rounded text-white hover:bg-red-700"
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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Katalog Yönetimi</h1>
          <button
            onClick={() => {
              setIsFormOpen(!isFormOpen);
              if (isFormOpen) {
                setFormInitialValues({ title: '', link: '', isActive: true });
                setEditId(null);
                setImageBase64('');
              }
            }}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            {isFormOpen ? 'Formu Gizle' : 'Yeni Katalog Ekle'}
          </button>
        </div>

        {isFormOpen && (
          <CatalogForm
            editId={editId}
            onSubmit={handleFormSubmit}
            initialValues={formInitialValues}
            onImageUpload={handleImageUpload}
            imageBase64={imageBase64}
          />
        )}

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full table-auto border-collapse text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 border">Başlık</th>
                <th className="p-3 border">Link</th>
                <th className="p-3 border">Durum</th>
                <th className="p-3 border">Görsel</th>
                <th className="p-3 border">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <TableRowComponent
                  key={section.id}
                  section={section}
                  onOpenTextModal={openTextModal}
                  onOpenImageModal={openImageModal} // ✅ Düzeltilmiş fonksiyon buraya veriliyor
                  onToggleActive={toggleActiveStatus}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onTruncate={truncateText}
                />
              ))}
              {sections.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-400">
                    Henüz katalog eklenmedi.
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

export default CatalogYönetimi;

