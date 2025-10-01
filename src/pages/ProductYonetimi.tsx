import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import pako from 'pako';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Swal from 'sweetalert2';
type Section = {
  id: string;
  title: string;
  description: string;
  images?: { imageData: string }[];
  isActive: boolean;
  enTitle: string;
  enDescription: string;
  hasTable: boolean;
  catalogLink: string;
  certificates?: { imageData: string }[];
  tableImage?: { imageData: string };
  brandActivityArea: {
    id: string;
    title: string;
  };
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

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

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

const ProductYonetimi: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [imageBase64, setImageBase64] = useState<string[]>([]); // çoklu
  const [certificatesBase64, setCertificatesBase64] = useState<string[]>([]);
  const [tableImageBase64, setTableImageBase64] = useState<string>(''); // tekli
  const [brandActivityAreas, setBrandActivityAreas] = useState<{ id: string, title: string }[]>([]);

  const fetchBrandActivityAreas = async () => {
    try {
      const res = await api.get('/brand-activity-areas');
      setBrandActivityAreas(res.data);
    } catch (err) {
      console.error('BrandActivityArea listesi alınamadı', err);
    }
  };

  const fetchSections = () => {
    api.get('/products')
      .then(res => setSections(res.data))
      .catch(err => console.error('Veri çekme hatası', err));
  };

  useEffect(() => {
    fetchSections();
    fetchBrandActivityAreas();
  }, []);

  const formik = useFormik({
    initialValues: {
      title: '',
      description: '',
      enTitle: '',
      enDescription: '',
      hasTable: false,
      catalogLink: '',
      brandActivityAreaId: '',
      isActive: false,
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Başlık zorunludur'),
      description: Yup.string().required('Açıklama zorunludur'),
      brandActivityAreaId: Yup.string().required('Marka alanı zorunlu'),
      enTitle: Yup.string().required('En Başlık alanı zorunlu'),
      enDescription: Yup.string().required('En Açıklama alanı zorunlu'),
      catalogLink: Yup.string().required('Link alanı zorunlu'),
    }),
    onSubmit: async (values, { resetForm }) => {
      const result = await Swal.fire({
        title: editId ? 'Ürün güncellensin mi?' : 'Yeni ürün eklensin mi?',
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
      try {
        const requestObject = {
          brandActivityAreaId: values.brandActivityAreaId,
          title: values.title,
          description: values.description,
          hasTable: values.hasTable,
          catalogLink: values.catalogLink,
          enTitle: values.enTitle,
          enDescription: values.enDescription,
          isActive: values.isActive,
        };

        const formData = new FormData();
        formData.append('request', new Blob([JSON.stringify(requestObject)], { type: 'application/json' }));

        if (imageBase64.length > 0) {
          imageBase64.forEach(img => formData.append('images', dataURLToFile(img)));
        }
        certificatesBase64.forEach(cert =>
          formData.append('certificates', dataURLToFile(cert))
        );
        if (tableImageBase64) {
          formData.append('tableImage', dataURLToFile(tableImageBase64));
        }
        if (editId) {
          await api.put(`/products/${editId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          await api.post('/products', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }

        fetchSections();
        resetForm();
        setEditId(null);
        setImageBase64([]);
        setCertificatesBase64([]);
        setTableImageBase64('');
        setIsFormOpen(false);
      } catch (err) {
        console.error('Form gönderme hatası:', err);
      }
    }
  });

  const handleEdit = (section: Section) => {
    formik.setValues({
      title: section.title,
      description: section.description,
      enTitle: section.enTitle,
      enDescription: section.enDescription,
      brandActivityAreaId: section.brandActivityArea.id,
      hasTable: section.hasTable,
      catalogLink: section.catalogLink,
      isActive: section.isActive,
    });

    setImageBase64(section.images?.map(img => decodeImage(img.imageData)) || []);
    setCertificatesBase64(section.certificates?.map(img => decodeImage(img.imageData)) || []);

    setTableImageBase64(section.tableImage?.imageData ? decodeImage(section.tableImage.imageData) : '');
    setEditId(section.id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Ürün silinsin mi?',
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
    await api.delete(`/products/${id}`);
    fetchSections();
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
    if (!result.isConfirmed) return;

    try {
      // Güncel veriyi çek
      const res = await api.get(`/products/${section.id}`);
      const existing = res.data;

      // request objesi
      const requestObject = {
        brandActivityAreaId: existing.brandActivityArea.id || '',
        title: existing.title || '',
        description: existing.description || '',
        hasTable: existing.hasTable || false,
        catalogLink: existing.catalogLink || '',
        enTitle: existing.enTitle || '',
        enDescription: existing.enDescription || '',
        isActive: !existing.isActive, // toggle burada
      };

      const formData = new FormData();
      formData.append(
        'request',
        new Blob([JSON.stringify(requestObject)], { type: 'application/json' })
      );

      // mevcut resimleri yeniden ekle
      if (existing.images?.length) {
        existing.images.forEach((img: { imageData: string }) => {
          formData.append('images', dataURLToFile(decodeImage(img.imageData)));
        });
      }

      if (existing.certificates?.length) {
        existing.certificates.forEach((cert: { imageData: string }) => {
          formData.append('certificates', dataURLToFile(decodeImage(cert.imageData)));
        });
      }

      if (existing.tableImage?.[0]?.imageData) {
        formData.append('tableImage', dataURLToFile(decodeImage(existing.tableImage[0].imageData)));
      }

      await api.put(`/products/${section.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      fetchSections();
    } catch (err) {
      console.error('Aktiflik güncellenemedi:', err);
    }
  };


  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Ürün Yönetimi</h1>
          <button
            onClick={() => {
              formik.resetForm();
              setEditId(null);
              setImageBase64([]);
              setCertificatesBase64([]);
              setTableImageBase64('');
              setIsFormOpen(prev => !prev);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {isFormOpen ? 'Formu Gizle' : 'Yeni Ürün Ekle'}
          </button>
        </div>

        {isFormOpen && (
          <form onSubmit={formik.handleSubmit} className="bg-white p-6 rounded-xl shadow space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select name="brandActivityAreaId" value={formik.values.brandActivityAreaId} onChange={formik.handleChange} className="w-full border rounded-md p-2">
                <option value="">Marka Seçin</option>
                {brandActivityAreas.map(area => (
                  <option key={area.id} value={area.id}>{area.title}</option>
                ))}
              </select>
              {formik.touched.brandActivityAreaId && formik.errors.brandActivityAreaId && (
                <div className="text-red-500 text-sm">
                  {formik.errors.brandActivityAreaId}
                </div>
              )}
              <input type="text" name="title" value={formik.values.title} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Başlık" />
              {formik.touched.title && formik.errors.title && (
                <div className="text-red-500 text-sm">
                  {formik.errors.title}
                </div>
              )}
              <input type="text" name="catalogLink" value={formik.values.catalogLink} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Katalog Linki" />
              {formik.touched.catalogLink && formik.errors.catalogLink && (
                <div className="text-red-500 text-sm">
                  {formik.errors.catalogLink}
                </div>
              )}
              <textarea name="description" value={formik.values.description} onChange={formik.handleChange} className="w-full border rounded-md p-2 md:col-span-2" placeholder="Açıklama" />
              {formik.touched.description && formik.errors.description && (
                <div className="text-red-500 text-sm">
                  {formik.errors.description}
                </div>
              )}
              <input type="text" name="enTitle" value={formik.values.enTitle} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Title (EN)" />
              {formik.touched.enTitle && formik.errors.enTitle && (
                <div className="text-red-500 text-sm">
                  {formik.errors.enTitle}
                </div>
              )}
              <textarea name="enDescription" value={formik.values.enDescription} onChange={formik.handleChange} className="w-full border rounded-md p-2 md:col-span-2" placeholder="Description (EN)" />
              {formik.touched.enDescription && formik.errors.enDescription && (
                <div className="text-red-500 text-sm">
                  {formik.errors.enDescription}
                </div>
              )}
              <label className="flex items-center gap-2 md:col-span-2">
                <input type="checkbox" name="hasTable" checked={formik.values.hasTable} onChange={formik.handleChange} />
                Tablo içeriyor mu?
              </label>
              <label className="flex items-center gap-2 md:col-span-2">
                <input type="checkbox" name="isActive" checked={formik.values.isActive} onChange={formik.handleChange} />
                Aktif mi?
              </label>
              <label className="md:col-span-2">Ana Görseller (çoklu):
                <input type="file" multiple accept="image/*" onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  Promise.all(files.map(fileToBase64)).then(setImageBase64);
                }} />
              </label>
              {imageBase64.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  className="h-24 inline-block rounded mr-2"
                  alt={`Main ${idx}`}
                />
              ))}
              <label className="md:col-span-2">Sertifikalar (çoklu):
                <input type="file" multiple accept="image/*" onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  Promise.all(files.map(fileToBase64)).then(setCertificatesBase64);
                }} />
              </label>
              {certificatesBase64.map((img, idx) => (
                <img key={idx} src={img} className="h-16 inline-block rounded mr-2" alt={`Cert ${idx}`} />
              ))}
              <label className="md:col-span-2">Tablo Görseli (tekli):
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) fileToBase64(file).then(setTableImageBase64);
                }} />
              </label>
              {tableImageBase64 && (
                <img src={tableImageBase64} className="h-24 rounded" alt="Table" />
              )}
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
                <th className="p-3 border">EN Title</th>
                <th className="p-3 border">Açıklama</th>
                <th className="p-3 border">EN Açıklama</th>
                <th className="p-3 border">Katalog Linki</th>
                <th className="p-3 border">Tablo İçeriyor mu</th>
                <th className="p-3 border">Görsel</th>
                <th className="p-3 border">Serfika Görseli</th>
                <th className="p-3 border">Tablo Görseli</th>
                <th className="p-3 border">Aktif mi</th>
                <th className="p-3 border">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sections.map(section => (
                <tr key={section.id} className="text-center">
                  <td className="p-3 border">{section.title}</td>
                  <td className="p-3 border">{section.enTitle}</td>
                  <td className="p-3 border">{section.description}</td>
                  <td className="p-3 border">{section.enDescription}</td>
                  <td className="p-3 border">{section.catalogLink}</td>
                  <td className="p-3 border">
                    <span className={section.hasTable ? 'text-green-600 font-semibold' : 'text-red-500'}>
                      {section.hasTable ? 'Evet' : 'Hayır'}
                    </span>
                  </td>
                  <td className="p-3 border">
                    {section.images && section.images.length > 1 ? (
                      <span>{section.images.length} adet resim var</span>
                    ) : section.images && section.images.length === 1 ? (
                      <img
                        src={decodeImage(section.images[0].imageData)}
                        className="h-24 w-24 object-cover rounded-md inline-block mr-1"
                      />
                    ) : null}
                  </td>

                  <td className="p-3 border">
                    {section.certificates && section.certificates.length > 1 ? (
                      <span>{section.certificates.length} adet resim var</span>
                    ) : section.certificates && section.certificates.length === 1 ? (
                      <img
                        src={decodeImage(section.certificates[0].imageData)}
                        alt="Certificate"
                        className="h-24 w-24 object-cover rounded-md inline-block mr-1"
                      />
                    ) : null}
                  </td>
                  <td className="p-3 border">
                    {section.tableImage?.imageData && <img src={decodeImage(section.tableImage.imageData)} alt="banner" className="h-24 w-24 object-cover rounded-md" />}
                  </td>
                  <td className="p-3 border">
                    <span className={section.isActive ? 'text-green-600 font-semibold' : 'text-red-500'}>
                      {section.isActive ? 'Evet' : 'Hayır'}
                    </span>
                  </td>
                  <td className="p-3 border space-x-2">
                    <button onClick={() => toggleActiveStatus(section)}
                      className={`px-3 py-1 rounded ${section.isActive ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                      {section.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                    </button>
                    <button onClick={() => handleEdit(section)}
                      className="bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500">Düzenle</button>
                    <button onClick={() => handleDelete(section.id)}
                      className="bg-red-600 px-3 py-1 rounded text-white hover:bg-red-700">Sil</button>
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

export default ProductYonetimi;
