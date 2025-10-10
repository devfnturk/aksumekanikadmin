import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import pako from 'pako';
import { useFormik } from 'formik';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import { useLoading } from '../contexts/LoadingContext';
import Modal from '../components/Modal';
import TextModalContent from '../components/TextModalContent';
import ImageModalContent from '../components/ImageModalContent';
// --- Bileşen Dışındaki Yardımcı Fonksiyonlar ---
// Bu fonksiyonlar bileşene bağlı olmadığı için dışarıda tanımlanarak
// her render'da yeniden oluşturulmaları engellenir.

/**
 * GZIP ile sıkıştırılmış ve base64 kodlanmış resim verisini çözer.
 * @param {string} imageData - Base64 formatındaki resim verisi.
 * @returns {string} - "data:image/jpeg;base64,..." formatında çözülmüş resim verisi.
 */
export function decodeImage(imageData: string): string {
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
    return `data:image/jpeg;base64,${btoa(result)}`;
  } catch (err) {
    console.error('Decode error:', err);
    return '';
  }
}


/**
 * Data URL'i File nesnesine dönüştürür.
 * @param {string} dataUrl - "data:..." formatındaki veri.
 * @returns {File} - Oluşturulan dosya nesnesi.
 */
const dataURLToFile = (dataUrl: string): File => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], 'image.jpg', { type: mime });
};

/**
 * Verilen metni belirli bir uzunlukta kısaltır.
 * @param {string | undefined} text - Kısaltılacak metin.
 * @param {number} maxLength - Maksimum uzunluk.
 * @returns {string} - Kısaltılmış metin.
 */
const truncateText = (text: string | undefined, maxLength: number = 50): string => {
  if (!text) return '';
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + '...';
  }
  return text;
};


type Section = {
  id: string;
  image?: { imageData: string }[];
  title: string;
  description: string;
  isActive: boolean;
  enTitle: string;
  enDescription: string;
};

// --- Memoize Edilmiş Alt Bileşenler ---
// Tablo Satırı Bileşeni
// React.memo ile sarmalandığı için sadece propları değiştiğinde yeniden render olur.
const SectionRow = React.memo(({ section, decodedImage, onEdit, onDelete, onToggle, onOpenText, onOpenImageModal }: {
  section: Section;
  decodedImage: string | null;
  onEdit: (section: Section) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onOpenText: (text: string) => void;
  onOpenImageModal: (imageUrls: string[], startIndex: number) => void;
}) => {
  const decodedImageUrls = useMemo(() => {
    // section.image varsa, her bir imageData'yı decode et. Hata durumunda boş stringleri filtrele.
    return section.image?.map(img => decodeImage(img.imageData)).filter(Boolean) ?? [];
  }, [section.image]);
  return (
    <tr className="text-center">
      <td className="p-3 border hover:bg-gray-50" onDoubleClick={() => onOpenText(section.title)}>{truncateText(section.title)}</td>
      <td className="p-3 border hover:bg-gray-50" onDoubleClick={() => onOpenText(section.enTitle)}>{truncateText(section.enTitle)}</td>
      <td className="p-3 border hover:bg-gray-50" onDoubleClick={() => onOpenText(section.description)}>{truncateText(section.description)}</td>
      <td className="p-3 border hover:bg-gray-50" onDoubleClick={() => onOpenText(section.enDescription)}>{truncateText(section.enDescription)}</td>
      <td className="p-3 border">
        <span className={section.isActive ? 'text-green-600 font-semibold' : 'text-red-500'}>
          {section.isActive ? 'Aktif' : 'Pasif'}
        </span>
      </td>
      <td className="p-3 border">
        {decodedImageUrls.length > 0 ? (
          <div className="relative group inline-block">
            {/* Sadece ilk resmi thumbnail olarak gösteriyoruz */}
            <img src={decodedImageUrls[0]} loading="lazy" alt="banner" className="h-20 w-20 object-cover rounded-md cursor-pointer"
              onClick={() => onOpenImageModal(decodedImageUrls, 0)} />

            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => onOpenImageModal(decodedImageUrls, 0)}>
              {/* Kullanıcıya kaç resim olduğunu belirtmek daha iyi bir deneyim sunar */}
              Büyüt ({decodedImageUrls.length})
            </div>
          </div>
        ) : (
          <span>Görsel Yok</span>
        )}
      </td>
      <td className="p-3 border space-x-2">
        <button
          onClick={() => onToggle(section.id)}
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

// --- Ana Bileşen ---
const BrandYonetimi: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [modalChildren, setModalChildren] = useState<React.ReactNode | null>(null);
  const { showLoading, hideLoading } = useLoading();


  const fetchSections = useCallback(async () => {
    showLoading();
    try {
      const res = await api.get('/brands');
      setSections(res.data);
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
      title: '',
      isActive: true,
      description: '',
      enTitle: '',
      enDescription: '',
    },
    onSubmit: async (values, { resetForm }) => {
      try {
        const result = await Swal.fire({
          title: editId ? 'Güncelleme onayı' : 'Ekleme onayı',
          text: editId ? 'Bu kaydı güncellemek istediğinize emin misiniz?' : 'Yeni kayıt eklemek istediğinize emin misiniz?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Evet',
          cancelButtonText: 'Hayır',
          buttonsStyling: false,
          customClass: {
            popup: 'rounded-xl shadow-lg',
            title: 'text-xl font-semibold',
            htmlContainer: 'text-gray-700',
            actions: 'flex justify-center gap-4 mt-4',
            confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
            cancelButton: 'bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400',
          },
        });

        if (!result.isConfirmed) return;
        showLoading();
        const formData = new FormData();
        const requestObject = {
          title: values.title,
          description: values.description,
          isActive: values.isActive,
          enTitle: values.enTitle,
          enDescription: values.enDescription,
        };

        formData.append('request', new Blob([JSON.stringify(requestObject)], { type: 'application/json' }));

        if (imageBase64) {
          const file = dataURLToFile(imageBase64);
          formData.append('files', file);
        }

        const promise = editId
          ? api.put(`/brands/${editId}`, formData)
          : api.post('/brands', formData);

        await promise;

        Swal.fire('Başarılı', editId ? 'Kayıt güncellendi' : 'Yeni kayıt eklendi', 'success');

        fetchSections();
        resetForm();
        setImageBase64('');
        setEditId(null);
        setIsFormOpen(false);
      } catch (err) {
        Swal.fire('Hata', 'İşlem sırasında hata oluştu', 'error');
        console.error('Form gönderme hatası:', err);
      }
      finally {
        hideLoading();
      }
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // useCallback ile fonksiyonlarımızı memoize ediyoruz.
  // Bu sayede SectionRow bileşenine her render'da yeni fonksiyonlar gönderilmez.
  const handleEdit = useCallback((section: Section) => {
    formik.setValues({
      title: section.title || '',
      description: section.description || '',
      isActive: section.isActive,
      enTitle: section.enTitle || '',
      enDescription: section.enDescription || '',
    });

    const decodedImg = section.image?.[0]?.imageData ? decodeImage(section.image[0].imageData) : '';
    setImageBase64(decodedImg);

    setEditId(section.id);
    setIsFormOpen(true);
  }, [formik]);

  const handleDelete = useCallback(async (id: string) => {
    const result = await Swal.fire({
      title: 'Silme onayı',
      text: 'Bu kaydı silmek istediğinize emin misiniz?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Evet',
      cancelButtonText: 'Hayır',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-xl shadow-lg',
        title: 'text-xl font-semibold',
        htmlContainer: 'text-gray-700',
        actions: 'flex justify-center gap-4 mt-4',
        confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
        cancelButton: 'bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400',
      },
    });

    if (!result.isConfirmed) return;
    showLoading();
    try {
      await api.delete(`/brands/${id}`);
      fetchSections();
      Swal.fire('Başarılı', 'Kayıt silindi', 'success');
    } catch (error) {
      Swal.fire('Hata', 'Kayıt silinemedi', 'error');
      console.error("Silme hatası:", error);
    }
    finally {
      hideLoading();
    }
  }, [fetchSections, showLoading, hideLoading]);

  const toggleActiveStatus = useCallback(async (id: string) => {
    const result = await Swal.fire({
      title: 'Durum değiştirme',
      text: 'Bu kaydın aktiflik durumunu değiştirmek istediğinize emin misiniz?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Evet',
      cancelButtonText: 'Hayır',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-xl shadow-lg',
        title: 'text-xl font-semibold',
        htmlContainer: 'text-gray-700',
        actions: 'flex justify-center gap-4 mt-4',
        confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700',
        cancelButton: 'bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400',
      },
    });

    if (!result.isConfirmed) return;
    showLoading();
    try {
      const existing = sections.find(s => s.id === id);
      if (!existing) {
        throw new Error("Kayıt bulunamadı.");
      }

      const formData = new FormData();
      const updatedSection = {
        isActive: !existing.isActive,
        title: existing.title || '',
        description: existing.description || '',
        enTitle: existing.enTitle || '',
        enDescription: existing.enDescription || '',
      };
      formData.append('request', new Blob([JSON.stringify(updatedSection)], { type: 'application/json' }));

      if (existing.image?.[0]?.imageData) {
        const decoded = decodeImage(existing.image[0].imageData);
        const file = dataURLToFile(decoded);
        formData.append('files', file);
      }

      await api.put(`/brands/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchSections();
      Swal.fire('Başarılı', 'Durum güncellendi', 'success');
    } catch (err) {
      Swal.fire('Hata', 'Aktiflik güncellenemedi', 'error');
      console.error('Aktiflik güncellenemedi:', err);
    } finally {
      hideLoading();
    }
  }, [fetchSections, sections, showLoading, hideLoading]);

  // useMemo ile resim decode etme işlemini sadece `sections` değiştiğinde yapıyoruz.
  // Bu sayede her render'da bu pahalı işlem tekrarlanmıyor.
  const decodedImages = useMemo(() => {
    const imageMap = new Map<string, string>();
    sections.forEach(section => {
      const encoded = section.image?.[0]?.imageData;
      if (encoded) {
        imageMap.set(section.id, decodeImage(encoded));
      }
    });
    return imageMap;
  }, [sections]);


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
          <h1 className="text-2xl font-bold">Marka Yönetimi</h1>
          <button
            onClick={() => {
              formik.resetForm();
              setEditId(null);
              setImageBase64('');
              setIsFormOpen((prev) => !prev);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {isFormOpen ? 'Formu Gizle' : 'Marka Ekle'}
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={formik.handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="title" value={formik.values.title} onChange={formik.handleChange} onBlur={formik.handleBlur} className="w-full border rounded-md p-2" placeholder="Başlık" />
              <div className="md:col-span-2">
                <textarea name="description" value={formik.values.description} onChange={formik.handleChange} onBlur={formik.handleBlur} className="w-full border rounded-md p-2" placeholder="Açıklama" />
                {formik.touched.description && formik.errors.description && <div className="text-red-500 text-sm">{formik.errors.description}</div>}
              </div>
              <input type="text" name="enTitle" value={formik.values.enTitle} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Başlık (EN)" />
              <textarea name="enDescription" value={formik.values.enDescription} onChange={formik.handleChange} className="w-full border rounded-md p-2 md:col-span-2" placeholder="Açıklama (EN)" />
              <select name="isActive" value={formik.values.isActive.toString()} onChange={formik.handleChange} className="w-full border rounded-md p-2">
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
              <input type="file" name="image" accept="image/*" onChange={handleImageUpload} className="md:col-span-2" />
              {imageBase64 && <img src={imageBase64} alt="Yüklenen görsel" className="h-32 mt-2 rounded" />}
            </div>
            <div className="text-right">
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                {editId ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full table-auto border-collapse text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 border">Başlık</th>
                <th className="p-3 border">(EN) Başlık</th>
                <th className="p-3 border">Açıklama</th>
                <th className="p-3 border">(EN) Açıklama</th>
                <th className="p-3 border">Durum</th>
                <th className="p-3 border">Görsel</th>
                <th className="p-3 border">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  decodedImage={decodedImages.get(section.id) || null}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggle={toggleActiveStatus}
                  onOpenText={openTextModal}
                  onOpenImageModal={openImageModal}
                />
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

export default BrandYonetimi;

