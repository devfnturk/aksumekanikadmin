import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFormik } from 'formik';
import Layout from '../components/Layout';
import api from '../api';
import pako from 'pako';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { useLoading } from '../contexts/LoadingContext';
import Modal from '../components/Modal';
import TextModalContent from '../components/TextModalContent';
import ImageModalContent from '../components/ImageModalContent';

type Section = {
  id: string;
  title: string;
  link: string;
  isActive: boolean;
  image?: { imageData: string }[];
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
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
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

// ⚡ YENİ: Form komponenti ayrıştırıldı - Parent re-render'dan izole
const ReferenceForm = React.memo(({
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
        <label className="block font-semibold mb-1">Resim Yükle</label>
        <input type="file" accept="image/*" onChange={onImageUpload} />
        {imageBase64 && (
          <img
            src={imageBase64}
            alt="Yüklenen görsel"
            className="h-32 mt-2 rounded object-cover"
            loading="lazy"
          />
        )}
      </div>
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
  const [imageBase64, setImageBase64] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [modalChildren, setModalChildren] = useState<React.ReactNode | null>(null);

  // ⚡ Form initial values'u memoize et
  const [formInitialValues, setFormInitialValues] = useState({
    title: '',
    link: '',
    isActive: true,
  });
  
  // DÜZELTME: fetchSections fonksiyonu useCallback ile sarmalandı.
  const fetchSections = useCallback(async () => {
    showLoading();
    try {
      const res = await api.get<Section[]>('/references');
      setSections(res.data);
      hideLoading();

      setTimeout(() => {
        res.data.forEach(section => {
          if (section.image && section.image[0]?.imageData) {
            decodeImage(section.image[0].imageData);
          }
        });
      }, 100);
    } catch (err) {
      console.error(err);
      hideLoading();
      Swal.fire('Hata!', 'Referanslar alınamadı.', 'error');
    }
  }, [showLoading, hideLoading]);

  // DÜZELTME: fetchSections bağımlılık dizisine eklendi.
  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const dataURLToFile = useCallback((dataUrl: string) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], 'image.jpg', { type: mime });
  }, []);

  // ⚡ Form submit handler'ı useCallback ile sar
  // DÜZELTME: fetchSections bağımlılık dizisine eklendi.
  const handleFormSubmit = useCallback(async (values: any) => {
    try {
      const confirmed = await Swal.fire({
        title: editId ? 'Güncellemek istediğine emin misin?' : 'Eklemek istediğine emin misin?',
        icon: 'question',
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

      if (!confirmed.isConfirmed) return;

      showLoading();

      if (editId) {
        const formData = new FormData();
        const requestObjectPut = {
          title: values.title,
          link: values.link,
          isActive: values.isActive,
        };
        formData.append('request', new Blob([JSON.stringify(requestObjectPut)], { type: 'application/json' }));

        if (imageBase64 && imageBase64.startsWith('data:')) {
          const file = dataURLToFile(imageBase64);
          formData.append('files', file);
        } else {
          const currentSection = sections.find(s => s.id === editId);
          if (currentSection && currentSection.image && currentSection.image[0]?.imageData) {
            const decodedImgData = decodeImage(currentSection.image[0].imageData);
            if (decodedImgData) {
              const file = dataURLToFile(decodedImgData);
              formData.append('files', file);
            }
          }
        }

        await api.put(`/references/${editId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Swal.fire({
          title: 'Başarılı!',
          text: 'Referans güncellendi.',
          icon: 'success',
          showConfirmButton: true,
          customClass: {
            actions: 'flex justify-center gap-4',
            confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
          },
        });
      } else {
        const formData = new FormData();
        const requestObjectPost = {
          title: values.title,
          link: values.link,
          isActive: values.isActive,
        };
        formData.append('request', new Blob([JSON.stringify(requestObjectPost)], { type: 'application/json' }));

        if (imageBase64 && imageBase64.startsWith('data:')) {
          const file = dataURLToFile(imageBase64);
          formData.append('files', file);
        } else {
          hideLoading();
          Swal.fire({
            title: 'Uyarı!',
            text: 'Lütfen bir referans görseli yükleyin.',
            icon: 'warning',
            showConfirmButton: true,
            customClass: {
              actions: 'flex justify-center gap-4',
              confirmButton: 'bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600',
            },
          });
          return;
        }

        await api.post('/references', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Swal.fire({
          title: 'Başarılı!',
          text: 'Referans eklendi.',
          icon: 'success',
          showConfirmButton: true,
          customClass: {
            actions: 'flex justify-center gap-4',
            confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
          },
        });
      }

      fetchSections();
      setFormInitialValues({ title: '', link: '', isActive: true });
      setImageBase64('');
      setEditId(null);
      setIsFormOpen(false);
    } catch (err) {
      console.error('Form gönderme hatası:', err);
      Swal.fire({
        title: 'Hata!',
        text: 'İşlem gerçekleştirilemedi.',
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
  }, [editId, imageBase64, sections, dataURLToFile, showLoading, hideLoading, fetchSections]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const getDecodedImage = useCallback((section: Section): string | null => {
    const imageObj = Array.isArray(section.image) ? section.image[0] : null;
    const encoded = imageObj?.imageData;
    return encoded ? decodeImage(encoded) : null;
  }, []);

  const handleEdit = useCallback((section: Section) => {
    setFormInitialValues({
      title: section.title,
      link: section.link,
      isActive: section.isActive,
    });
    setImageBase64(getDecodedImage(section) || '');
    setEditId(section.id);
    setIsFormOpen(true);
  }, [getDecodedImage]);

  // DÜZELTME: fetchSections bağımlılık dizisine eklendi.
  const handleDelete = useCallback(async (id: string) => {
    try {
      const confirmed = await Swal.fire({
        title: 'Silmek istediğine emin misin?',
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

      if (!confirmed.isConfirmed) return;

      showLoading();
      await api.delete(`/references/${id}`);
      await fetchSections();
      Swal.fire({
        title: 'Başarılı!',
        text: 'Referans silindi.',
        icon: 'success',
        showConfirmButton: true,
        customClass: {
          actions: 'flex justify-center gap-4',
          confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        },
      });
    } catch (err) {
      console.error('Silme hatası:', err);
      Swal.fire({
        title: 'Hata!',
        text: 'İşlem gerçekleştirilemedi.',
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

  // DÜZELTME: fetchSections bağımlılık dizisine eklendi.
  const handleToggleActive = useCallback(async (id: string, newState: boolean) => {
    try {
      const confirmed = await Swal.fire({
        title: `Referans ${newState ? 'aktif' : 'pasif'} olacak. Devam edilsin mi?`,
        icon: 'question',
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

      if (!confirmed.isConfirmed) return;

      showLoading();

      const res = await api.get(`/references/${id}`);
      const existing = res.data;

      const formData = new FormData();
      const requestObject = {
        title: existing.title,
        link: existing.link,
        isActive: newState,
      };
      formData.append('request', new Blob([JSON.stringify(requestObject)], { type: 'application/json' }));

      if (existing.image && existing.image[0]?.imageData) {
        const decodedImgData = decodeImage(existing.image[0].imageData);
        if (decodedImgData) {
          const file = dataURLToFile(decodedImgData);
          formData.append('files', file);
        }
      }

      await api.put(`/references/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await fetchSections();
      Swal.fire({
        title: 'Başarılı!',
        text: `Durum ${newState ? 'aktif' : 'pasif'} olarak güncellendi.`,
        icon: 'success',
        showConfirmButton: true,
        customClass: {
          actions: 'flex justify-center gap-4',
          confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        },
      });
    } catch (err) {
      console.error('Aktiflik güncellenemedi:', err);
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

  const truncateText = useCallback((text: string, maxLength: number) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  }, []);


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

  // ⚡ PERFORMANS İYİLEŞTİRMESİ: Row Component
  const TableRowComponent = React.memo(({ section }: { section: Section }) => {
    const [imgSrc, setImgSrc] = useState<string>('');
    const decodedImageUrls = useMemo(() => {
      // section.image varsa, her bir imageData'yı decode et. Hata durumunda boş stringleri filtrele.
      return section.image?.map(img => decodeImage(img.imageData)).filter(Boolean) ?? [];
    }, [section.image]);

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
          onDoubleClick={() => openTextModal(section.title)}
          title={section.title.length > 50 ? section.title : undefined}
        >
          {truncateText(section.title, 50)}
        </td>
        <td
          className="p-3 border hover:bg-gray-50 cursor-pointer"
          onDoubleClick={() => openTextModal(section.link)}
          title={section.link.length > 50 ? section.link : undefined}
        >
          {truncateText(section.link, 50)}
        </td>
        <td className="p-3 border">
          {imgSrc ? (
            <div
              className="relative w-16 h-10 mx-auto rounded overflow-hidden group cursor-pointer"
              onClick={() => openImageModal(decodedImageUrls, 0)}
            >
              <img
                src={imgSrc}
                alt="Referans görseli"
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
        <td className="p-3 border">
          <span className={section.isActive ? 'text-green-600 font-semibold' : 'text-red-500'}>
            {section.isActive ? 'Aktif' : 'Pasif'}
          </span>
        </td>
        <td className="p-3 border space-x-2">
          <button
            onClick={() => handleToggleActive(section.id, !section.isActive)}
            className={`${section.isActive ? 'bg-red-500' : 'bg-green-500'} text-white px-3 py-1 rounded hover:opacity-90`}
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
        <h1 className="text-2xl font-bold">Referans Yönetimi</h1>
        <div className="text-right">
          <button
            onClick={() => {
              setIsFormOpen(!isFormOpen);
              if (isFormOpen) {
                setFormInitialValues({ title: '', link: '', isActive: true });
                setImageBase64('');
                setEditId(null);
              }
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
            onImageUpload={handleImageUpload}
            imageBase64={imageBase64}
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

export default ReferansYonetimi;
