import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import pako from 'pako';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

type Section = {
  id: string;
  title: string;
  description: string;
  image?: { imageData: string }[];
  isActive: boolean;
  enTitle: string;
  enDescription: string;
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

const BrandYonetimi: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [imageBase64, setImageBase64] = useState<string>('');

  const fetchSections = () => {
    api
      .get('/brands')
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
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], 'image.jpg', { type: mime });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageBase64(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const formik = useFormik({
    initialValues: {
      title: '',
      isActive: true,
      description: '',
      enTitle: '',
      enDescription: '',
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Başlık zorunludur'),
      description: Yup.string().required('Açıklama zorunludur'),
      enTitle: Yup.string().required('EN Açıklama zorunludur'),
      enDescription: Yup.string().required('EN Başlık zorunludur'),
      isActive: Yup.boolean(),
    }),
    onSubmit: async (values, { resetForm }) => {
      // Önce validation
      const errors = await formik.validateForm();
      if (Object.keys(errors).length > 0) return;

      const confirm = await Swal.fire({
        title: editId ? 'Güncelleme Onayı' : 'Ekleme Onayı',
        text: editId
          ? 'Bu içeriği güncellemek istiyor musunuz?'
          : 'Yeni içerik eklemek istiyor musunuz?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Evet',
        cancelButtonText: 'Hayır',
        customClass: {
          popup: 'rounded-xl shadow-lg',
          confirmButton:
            'bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 mr-2',
          cancelButton:
            'bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400',
        },
      });

      if (!confirm.isConfirmed) return;

      try {
        const formData = new FormData();
        const requestObject = {
          title: values.title,
          isActive: values.isActive,
          description: values.description,
          enTitle: values.enTitle,
          enDescription: values.enDescription,
        };

        formData.append(
          'request',
          new Blob([JSON.stringify(requestObject)], { type: 'application/json' })
        );

        if (imageBase64) {
          formData.append('files', dataURLToFile(imageBase64));
        }

        if (editId) {
          await api.put(`/brands/${editId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          Swal.fire({
            title: 'Başarılı!',
            text: 'İçerik güncellendi.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
          });
        } else {
          await api.post('/brands', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          Swal.fire({
            title: 'Başarılı!',
            text: 'Yeni içerik eklendi.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false,
          });
        }

        resetForm();
        setImageBase64('');
        setEditId(null);
        setIsFormOpen(false);
        fetchSections();
      } catch (err) {
        console.error('Form gönderme hatası:', err);
        Swal.fire({
          title: 'Hata!',
          text: 'İşlem sırasında bir hata oluştu.',
          icon: 'error',
          confirmButtonText: 'Tamam',
        });
      }
    },
  });

  const handleEdit = (section: Section) => {
    formik.setValues({
      title: section.title,
      description: section.description,
      enTitle: section.enTitle,
      enDescription: section.enDescription,
      isActive: section.isActive,
    });
    setImageBase64(section.image?.[0]?.imageData ? decodeImage(section.image[0].imageData) : '');
    setEditId(section.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirm = await Swal.fire({
      title: 'Emin misiniz?',
      text: 'Bu içeriği silmek üzeresiniz!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Evet, sil!',
      cancelButtonText: 'Hayır',
      customClass: {
        popup: 'rounded-xl shadow-lg',
        confirmButton:
          'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mr-2',
        cancelButton:
          'bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400',
      },
    });

    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/brands/${id}`);
      Swal.fire({
        title: 'Silindi!',
        text: 'İçerik başarıyla silindi.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
      fetchSections();
    } catch (err) {
      console.error('Silme hatası:', err);
      Swal.fire({
        title: 'Hata!',
        text: 'Silme işlemi başarısız oldu.',
        icon: 'error',
        confirmButtonText: 'Tamam',
      });
    }
  };

  const toggleActiveStatus = async (id: string) => {
    try {
      const res = await api.get(`/brands/${id}`);
      const existing = res.data;

      const formData = new FormData();
      const updatedSection = {
        title: existing.title || '',
        description: existing.description || '',
        enTitle: existing.enTitle || '',
        enDescription: existing.enDescription || '',
        isActive: !existing.isActive,
      };

      formData.append(
        'request',
        new Blob([JSON.stringify(updatedSection)], { type: 'application/json' })
      );

      if (existing.image?.[0]?.imageData) {
        const decoded = decodeImage(existing.image[0].imageData);
        formData.append('files', dataURLToFile(decoded));
      }

      await api.put(`/brands/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchSections();
    } catch (err) {
      console.error('Aktiflik güncellenemedi:', err);
      Swal.fire({
        title: 'Hata!',
        text: 'Durum güncellenemedi.',
        icon: 'error',
        confirmButtonText: 'Tamam',
      });
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Brand Yönetimi</h1>
          <button
            onClick={() => {
              formik.resetForm();
              setEditId(null);
              setIsFormOpen((prev) => !prev);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {isFormOpen ? 'Formu Gizle' : 'Yeni Brand Ekle'}
          </button>
        </div>

        {isFormOpen && (
          <form
            onSubmit={formik.handleSubmit}
            className="bg-white p-6 rounded-xl shadow space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2">
                <input
                  type="text"
                  name="title"
                  value={formik.values.title}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full border rounded-md p-2"
                  placeholder="Başlık"
                />
                {formik.touched.title && formik.errors.title && (
                  <p className="text-red-500 text-sm">{formik.errors.title}</p>
                )}
              </div>

              <div className="col-span-1 md:col-span-2">
                <textarea
                  name="description"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className="w-full border rounded-md p-2"
                  placeholder="Açıklama"
                />
                {formik.touched.description && formik.errors.description && (
                  <p className="text-red-500 text-sm">{formik.errors.description}</p>
                )}
              </div>

              <input
                type="text"
                name="enTitle"
                value={formik.values.enTitle}
                onChange={formik.handleChange}
                className="w-full border rounded-md p-2"
                placeholder="Title (EN)"
              />
               {formik.touched.enTitle && formik.errors.enTitle && (
                  <p className="text-red-500 text-sm">{formik.errors.enTitle}</p>
                )}
              <textarea
                name="enDescription"
                value={formik.values.enDescription}
                onChange={formik.handleChange}
                className="w-full border rounded-md p-2 md:col-span-2"
                placeholder="Description (EN)"
              />
               {formik.touched.enDescription && formik.errors.enDescription && (
                  <p className="text-red-500 text-sm">{formik.errors.enDescription}</p>
                )}
              <select
                name="isActive"
                value={formik.values.isActive.toString()}
                onChange={formik.handleChange}
                className="w-full border rounded-md p-2"
              >
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>

              <input
                type="file"
                name="image"
                accept="image/*"
                onChange={handleImageUpload}
                className="md:col-span-2"
              />
              {imageBase64 && (
                <img
                  src={imageBase64}
                  alt="Yüklenen görsel"
                  className="h-32 mt-2 rounded"
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
        )}

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full table-auto border-collapse text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 border">Başlık</th>
                <th className="p-3 border">EN Title</th>
                <th className="p-3 border">Açıklama</th>
                <th className="p-3 border">EN Açıklama</th>
                <th className="p-3 border">Durum</th>
                <th className="p-3 border">Görsel</th>
                <th className="p-3 border">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <tr key={section.id} className="text-center">
                  <td className="p-3 border">{section.title}</td>
                  <td className="p-3 border">{section.enTitle}</td>
                  <td className="p-3 border">{section.description}</td>
                  <td className="p-3 border">{section.enDescription}</td>
                  <td className="p-3 border">
                    <span
                      className={
                        section.isActive
                          ? 'text-green-600 font-semibold'
                          : 'text-red-500'
                      }
                    >
                      {section.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="p-3 border">
                    {section.image?.[0]?.imageData && (
                      <img
                        src={decodeImage(section.image[0].imageData)}
                        alt="banner"
                        className="h-32 w-32 object-cover rounded-md"
                      />
                    )}
                  </td>
                  <td className="p-3 border space-x-2">
                    <button
                      onClick={() => toggleActiveStatus(section.id)}
                      className={`px-3 py-1 rounded ${
                        section.isActive
                          ? 'bg-gray-500 hover:bg-gray-600'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
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
                      className="bg-red-600 px-3 py-1 rounded text-white hover:bg-red-700"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

export default BrandYonetimi;
