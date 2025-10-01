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
  image?: { imageData: string }[];
  title: string;
  link: string;
  isActive: boolean;
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

const CatalogYönetimi: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [imageBase64, setImageBase64] = useState<string>('');

  const fetchSections = () => {
    api
      .get('/catalogs')
      .then((res) => setSections(res.data))
      .catch((err) => console.error('Veri çekme hatası', err));
  };

  useEffect(() => { fetchSections(); }, []);

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
    },
    validationSchema: Yup.object({
      link: Yup.string().required('Link zorunlu'),
      title: Yup.string().required('Başlık zorunludur'),
    }),
    onSubmit: async (values, { resetForm }) => {
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

      if (result.isConfirmed) {
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
            showConfirmButton: true, // Bu yoksa buton gözükmez
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
            showConfirmButton: true, // Bu yoksa buton gözükmez
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
      link: section.link || '',
      isActive: section.isActive,
    });
    setImageBase64(section.image?.[0]?.imageData ? decodeImage(section.image[0].imageData) : '');
    setEditId(section.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
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

    if (result.isConfirmed) {
      try {
        await api.delete(`/catalogs/${id}`);
        Swal.fire({
          title: 'Silindi!',
          text: 'Katalog başarıyla silindi.',
          icon: 'success',
          showConfirmButton: true, // Bu yoksa buton gözükmez
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
          showConfirmButton: true, // Bu yoksa buton gözükmez
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
          link: section.link,
          isActive: !section.isActive,
        };

        formData.append('request', new Blob([JSON.stringify(requestObject)], { type: 'application/json' }));
        if (section.image?.[0]?.imageData) {
          const file = dataURLToFile(decodeImage(section.image[0].imageData));
          formData.append('files', file);
        } else {
          formData.append('files', new Blob([])); // yoksa boş gönder
        }

        await api.put(`/catalogs/${section.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        Swal.fire({
          title: 'Başarılı!',
          text: 'Katalog güncellendi.',
          icon: 'success',
          showConfirmButton: true, // Bu yoksa buton gözükmez
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
          showConfirmButton: true, // Bu yoksa buton gözükmez
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

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Katalog Yönetimi</h1>
          <button
            onClick={() => {
              formik.resetForm();
              setEditId(null);
              setIsFormOpen((prev) => !prev);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {isFormOpen ? 'Formu Gizle' : 'Yeni Katalog Ekle'}
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={formik.handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" name="title" value={formik.values.title} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Başlık" />
              {formik.touched.title && formik.errors.title && (
                <div className="text-red-500 text-sm">
                  {formik.errors.title}
                </div>
              )}
              <input type="text" name="link" value={formik.values.link} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Link" />
              {formik.touched.link && formik.errors.link && (
                <div className="text-red-500 text-sm">
                  {formik.errors.link}
                </div>
              )}
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
                <th className="p-3 border">Link</th>
                <th className="p-3 border">Durum</th>
                <th className="p-3 border">Görsel</th>
                <th className="p-3 border">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <tr key={section.id} className="text-center">
                  <td className="p-3 border">{section.title}</td>
                  <td className="p-3 border">{section.link}</td>
                  <td className="p-3 border">
                    <span className={section.isActive ? 'text-green-600 font-semibold' : 'text-red-500'}>
                      {section.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="p-3 border">
                    {section.image?.[0]?.imageData && <img src={decodeImage(section.image[0].imageData)} alt="banner" className="h-32 w-32 object-cover rounded-md" />}
                  </td>
                  <td className="p-3 border space-x-2">
                    <button onClick={() => toggleActiveStatus(section)} className={`px-3 py-1 rounded ${section.isActive ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
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
    </Layout>
  );
};

export default CatalogYönetimi;
