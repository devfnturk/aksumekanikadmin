import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Layout from '../components/Layout';
import api from '../api';
import pako from 'pako';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

type Section = {
  id: string;
  title: string;
  link: string;
  isActive: boolean;
  image?: { imageData: string }[];
};

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

const ReferansYonetimi: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const res = await api.get<Section[]>('/references');
      setSections(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire('Hata!', 'Referanslar alınamadı.', 'error');
    }
  };

  const dataURLToFile = (dataUrl: string) => {
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

  const formik = useFormik({
    initialValues: {
      title: '',
      link: '',
      isActive: true,
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Başlık zorunlu'),
      link: Yup.string().required('Link zorunlu'),
    }),
    onSubmit: async (values, { resetForm }) => {
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

        if (editId) {
          // PUT
          const formData = new FormData();
          const requestObjectPut = {
            title: values.title,
            link: values.link,
            isActive: values.isActive,
          };
          formData.append('request', new Blob([JSON.stringify(requestObjectPut)], { type: 'application/json' }));
          if (imageBase64) {
            const file = dataURLToFile(imageBase64);
            formData.append('files', file);
          }

          await api.put(`/references/${editId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          Swal.fire({
            title: 'Başarılı!',
            text: 'Referans güncellendi.',
            icon: 'success',
            showConfirmButton: true, // Bu yoksa buton gözükmez
            customClass: {
              actions: 'flex justify-center gap-4',
              confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
            },
          });
        } else {
          // POST
          const formData = new FormData();
          const requestObjectPost = {
            title: values.title,
            link: values.link,
          };
          formData.append('request', new Blob([JSON.stringify(requestObjectPost)], { type: 'application/json' }));
          if (imageBase64) {
            const file = dataURLToFile(imageBase64);
            formData.append('files', file);
          }

          await api.post('/references', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          Swal.fire({
            title: 'Başarılı!',
            text: 'Referans eklendi.',
            icon: 'success',
            showConfirmButton: true, // Bu yoksa buton gözükmez
            customClass: {
              actions: 'flex justify-center gap-4',
              confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
            },
          });
        }

        fetchSections();
        resetForm();
        setImageBase64('');
        setEditId(null);
        setIsFormOpen(false);
      } catch (err) {
        console.error('Form gönderme hatası:', err);
        Swal.fire({
          title: 'Hata!',
          text: 'İşlem gerçekleştirilemedi.',
          icon: 'error',
          showConfirmButton: true, // Bu yoksa buton gözükmez
          customClass: {
            actions: 'flex justify-center gap-4',
            confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
          },
        });
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

  const handleEdit = (section: Section) => {
    formik.setValues({
      title: section.title,
      link: section.link,
      isActive: section.isActive,
    });
    setImageBase64(section.image?.[0]?.imageData ? decodeImage(section.image[0].imageData) : '');
    setEditId(section.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
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

      await api.delete(`/references/${id}`);
      fetchSections();
      Swal.fire({
        title: 'Başarılı!',
        text: 'Referans silindi.',
        icon: 'success',
        showConfirmButton: true, // Bu yoksa buton gözükmez
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
        showConfirmButton: true, // Bu yoksa buton gözükmez
        customClass: {
          actions: 'flex justify-center gap-4',
          confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        },
      });
    }
  };

  const handleToggleActive = async (id: string, newState: boolean) => {
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
        const file = dataURLToFile(decodeImage(existing.image[0].imageData));
        formData.append('files', file);
      }

      await api.put(`/references/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      fetchSections();
      Swal.fire({
        title: 'Başarılı!',
        text: `Durum ${newState ? 'aktif' : 'pasif'} olarak güncellendi.`,
        icon: 'success',
        showConfirmButton: true, // Bu yoksa buton gözükmez
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
        showConfirmButton: true, // Bu yoksa buton gözükmez
        customClass: {
          actions: 'flex justify-center gap-4',
          confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700',
        },
      });
    }
  };

  const getDecodedImage = (section: Section): string | null => {
    const imageObj = Array.isArray(section.image) ? section.image[0] : null;
    const encoded = imageObj?.imageData;
    return encoded ? decodeImage(encoded) : null;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Referanslar Yönetimi</h1>
        <div className="text-right">
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
          >
            {isFormOpen ? 'Formu Gizle' : 'Yeni Ekle'}
          </button>
        </div>

        {isFormOpen && (
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
              />
              {formik.touched.title && formik.errors.title && (
                <div className="text-red-500 text-sm">{formik.errors.title}</div>
              )}
            </div>
            <div>
              <label className="block font-semibold mb-1">Link</label>
              <input
                name="link"
                value={formik.values.link}
                onChange={formik.handleChange}
                className="w-full border rounded-md p-2"
              />
              {formik.touched.link && formik.errors.link && (
                <div className="text-red-500 text-sm">{formik.errors.link}</div>
              )}
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
              <input type="file" accept="image/*" onChange={handleImageUpload} />
              {imageBase64 && (
                <img src={imageBase64} alt="Yüklenen görsel" className="h-32 mt-2 rounded" />
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
              {sections.map((section) => (
                <tr key={section.id} className="text-center">
                  <td className="p-3 border">{section.title}</td>
                  <td className="p-3 border">{section.link}</td>
                  <td className="p-3 border space-x-2">
                    {section.image && Array.isArray(section.image) && section.image[0]?.imageData ? (
                      <img
                        src={getDecodedImage(section) || ''}
                        alt="Referans görseli"
                        className="w-16 h-10 object-cover mx-auto rounded"
                      />
                    ) : (
                      <span className="text-gray-400 italic">Yok</span>
                    )}
                  </td>
                  <td className="p-3 border">{section.isActive ? 'Aktif' : 'Pasif'}</td>
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
    </Layout>
  );
};

export default ReferansYonetimi;
