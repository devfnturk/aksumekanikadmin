import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import pako from 'pako';
import { useFormik } from 'formik';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

type Section = {
  id: string;
  image?: { imageData: string }[];
  title: string;
  description: string;
  tag: string;
  link: string;
  isActive: boolean;
  enTitle: string;
  enDescription: string;
  enTag: string;
};

export function decodeImage(imageData: string): string {
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
    return `data:image/jpeg;base64,${btoa(result)}`;
  } catch (err) {
    console.error('Decode error:', err);
    return '';
  }
}

// Modal için yeni bir bileşen oluşturalım veya bu dosya içinde tanımlayalım
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({
  isOpen,
  onClose,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-700 hover:text-gray-900 text-2xl"
        >
          &times;
        </button>
        {children}
      </div>
    </div>
  );
};

const BannerYonetimi: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [imageBase64, setImageBase64] = useState<string>('');

  // Modal state'leri
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);

  const fetchSections = () => {
    api
      .get('/banners')
      .then((res) => setSections(res.data))
      .catch((err) => console.error('Veri çekme hatası', err));
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const dataURLToFile = (dataUrl: string) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], 'image.jpg', { type: mime });
  };

  const formik = useFormik({
    initialValues: {
      title: '',
      link: '',
      isActive: true,
      description: '',
      tag: '',
      enTitle: '',
      enDescription: '',
      enTag: '',
    },
    onSubmit: async (values, { resetForm }) => {
      const result = await Swal.fire({
        title: editId ? 'Afiş güncellensin mi?' : 'Yeni afiş eklensin mi?',
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

      if (result.isConfirmed) {
        try {
          const formData = new FormData();
          const requestObject = {
            title: values.title,
            link: values.link,
            isActive: values.isActive,
            description: values.description,
            tag: values.tag,
            enTitle: values.enTitle,
            enDescription: values.enDescription,
            enTag: values.enTag,
          };
          formData.append('request', new Blob([JSON.stringify(requestObject)], { type: 'application/json' }));
          if (imageBase64) formData.append('files', dataURLToFile(imageBase64));

          if (editId) {
            await api.put(`/banners/${editId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
          } else {
            await api.post('/banners', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
          }
          Swal.fire({
            title: 'Başarılı!',
            text: editId ? 'Afiş güncellendi.' : 'Afiş eklendi.',
            icon: 'success',
            showConfirmButton: true,
            customClass: {
              actions: 'flex justify-center gap-4',
              confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
            },
          });
          fetchSections();
          resetForm();
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
        }
      }
    },
  });

  const handleEdit = (section: Section) => {
    formik.setValues({
      title: section.title || '',
      description: section.description || '',
      tag: section.tag || '',
      link: section.link || '',
      isActive: section.isActive,
      enTitle: section.enTitle || '',
      enDescription: section.enDescription || '',
      enTag: section.enTag || '',
    });
    setImageBase64(section.image?.[0]?.imageData ? decodeImage(section.image[0].imageData) : '');
    setEditId(section.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Afiş silinsin mi?',
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

    if (result.isConfirmed) {
      try {
        await api.delete(`/banners/${id}`);
        Swal.fire({
          title: 'Silindi!',
          text: 'Afiş başarıyla silindi.',
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
      }
    }
  };

  const toggleActiveStatus = async (section: Section) => {
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

    if (result.isConfirmed) {
      try {
        const formData = new FormData();

        const requestObject = {
          title: section.title,
          description: section.description,
          tag: section.tag,
          link: section.link,
          isActive: !section.isActive,
          enTitle: section.enTitle,
          enDescription: section.enDescription,
          enTag: section.enTag,
        };

        formData.append('request', new Blob([JSON.stringify(requestObject)], { type: 'application/json' }));
        if (section.image?.[0]?.imageData) {
          const file = dataURLToFile(decodeImage(section.image[0].imageData));
          formData.append('files', file);
        } else {
          formData.append('files', new Blob([]));
        }

        await api.put(`/banners/${section.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        Swal.fire({
          title: 'Başarılı!',
          text: 'Afiş güncellendi.',
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
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageBase64(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Metin kısaltma fonksiyonu
  const truncateText = (text: string | undefined, maxLength: number = 50) => {
    if (!text) return '';
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  // Metin modalını açma
  const openTextModal = (content: string) => {
    setModalContent(content);
    setModalImage(null);
    setShowModal(true);
  };

  // Görsel modalını açma
  const openImageModal = (imageUrl: string) => {
    setModalImage(imageUrl);
    setModalContent(null);
    setShowModal(true);
  };

  // Modalı kapatma
  const closeModal = () => {
    setShowModal(false);
    setModalContent(null);
    setModalImage(null);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Afiş Yönetimi</h1>
          <button
            onClick={() => {
              formik.resetForm();
              setEditId(null);
              setImageBase64(''); // Reset image when opening form
              setIsFormOpen((prev) => !prev);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {isFormOpen ? 'Formu Gizle' : 'Yeni Afiş Ekle'}
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={formik.handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="tag" value={formik.values.tag} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Etiket" />
              <input type="text" name="title" value={formik.values.title} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Başlık" />
              <textarea name="description" value={formik.values.description} onChange={formik.handleChange} className="w-full border rounded-md p-2 md:col-span-2" placeholder="Açıklama" />
              <input type="text" name="enTag" value={formik.values.enTag} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Etiket (EN)" />
              <input type="text" name="enTitle" value={formik.values.enTitle} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Başlık (EN)" />
              <textarea name="enDescription" value={formik.values.enDescription} onChange={formik.handleChange} className="w-full border rounded-md p-2 md:col-span-2" placeholder="Açıklama (EN)" />
              <input type="text" name="link" value={formik.values.link} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Link" />
              <select name="isActive" value={formik.values.isActive.toString()} onChange={formik.handleChange} className="w-full border rounded-md p-2">
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
              <input type="file" name="image" accept="image/*" onChange={handleImageUpload} className="md:col-span-2" />
              {imageBase64 && <img src={imageBase64} alt="Yüklenen görsel" className="h-32 mt-2 rounded object-cover" />}
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
                <th className="p-3 border">Etiket</th>
                <th className="p-3 border">(EN) Etiket</th>
                <th className="p-3 border">Başlık</th>
                <th className="p-3 border">(EN) Başlık</th>
                <th className="p-3 border">Açıklama</th>
                <th className="p-3 border">(EN) Açıklama</th>
                <th className="p-3 border">Link</th>
                <th className="p-3 border">Durum</th>
                <th className="p-3 border">Görsel</th>
                <th className="p-3 border">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <tr key={section.id} className="text-center">
                  <td
                    className="p-3 border cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => section.tag && openTextModal(section.tag)}
                  >
                    {truncateText(section.tag)}
                  </td>
                  <td
                    className="p-3 border cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => section.enTag && openTextModal(section.enTag)}
                  >
                    {truncateText(section.enTag)}
                  </td>
                  <td
                    className="p-3 border cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => section.title && openTextModal(section.title)}
                  >
                    {truncateText(section.title)}
                  </td>
                  <td
                    className="p-3 border cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => section.enTitle && openTextModal(section.enTitle)}
                  >
                    {truncateText(section.enTitle)}
                  </td>
                  <td
                    className="p-3 border cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => section.description && openTextModal(section.description)}
                  >
                    {truncateText(section.description)}
                  </td>
                  <td
                    className="p-3 border cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => section.enDescription && openTextModal(section.enDescription)}
                  >
                    {truncateText(section.enDescription)}
                  </td>
                  <td
                    className="p-3 border cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => section.link && openTextModal(section.link)}
                  >
                    {truncateText(section.link)}
                  </td>
                  <td className="p-3 border">
                    <span className={section.isActive ? 'text-green-600 font-semibold' : 'text-red-500'}>
                      {section.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="p-3 border">
                    {section.image && section.image.length > 0 && section.image[0]?.imageData ? (
                      <div className="relative group inline-block">
                        <img
                          src={decodeImage(section.image[0].imageData)}
                          alt="banner"
                          className="h-20 w-20 object-cover rounded-md cursor-pointer"
                          onClick={() => openImageModal(decodeImage(section.image![0].imageData))}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => openImageModal(decodeImage(section.image![0].imageData))}>
                          Büyüt
                        </div>
                      </div>
                    ) : (
                      <span>Görsel Yok</span>
                    )}
                  </td>
                  <td className="p-3 border space-x-2">
                    <button onClick={() => toggleActiveStatus(section)} className={`${section.isActive ? 'bg-red-500' : 'bg-green-500'
                      } text-white px-3 py-1 rounded hover:opacity-90`}>
                      {section.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                    </button>
                    <button onClick={() => handleEdit(section)} className="bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500">Düzenle</button>
                    <button onClick={() => handleDelete(section.id)} className="bg-red-600 px-3 py-1 rounded text-white hover:bg-red-700">Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Bileşeni */}
      <Modal isOpen={showModal} onClose={closeModal}>
        {modalContent && (
          <div>
            <h2 className="text-xl font-bold mb-4">Detaylı İçerik</h2>
            <p className="whitespace-pre-wrap break-words">{modalContent}</p>
          </div>
        )}
        {modalImage && (
          <div>
            <h2 className="text-xl font-bold mb-4">Görseli Büyüt</h2>
            <img src={modalImage} alt="Büyütülmüş Görsel" className="max-w-full h-auto mx-auto" />
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default BannerYonetimi;