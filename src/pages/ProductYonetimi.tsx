import React, { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import pako from 'pako';
import { useFormik } from 'formik';
import Swal from 'sweetalert2';

// Types remain the same
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
    brands: any;
  };
};

// decodeImage function remains the same
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

// fileToBase64 function remains the same
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// dataURLToFile function remains the same
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

// Yeni yardımcı fonksiyon: Metni kısaltma
const truncateText = (text: string | undefined, maxLength: number = 50): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const ProductYonetimi: React.FC = () => {
  const [sections, setSections] = useState<Section[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [imageBase64, setImageBase64] = useState<string[]>([]);
  const [certificatesBase64, setCertificatesBase64] = useState<string[]>([]);
  const [tableImageBase64, setTableImageBase64] = useState<string>('');
  const [brandActivityAreas, setBrandActivityAreas] = useState<{ id: string, title: string, brands: any }[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Number of items per page

  // Text Modal states
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);
  const [textModalContent, setTextModalContent] = useState('');
  const [textModalTitle, setTextModalTitle] = useState('');

  // Image Gallery Modal states
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryModalTitle, setGalleryModalTitle] = useState('');


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

  // Calculate total pages and current items to display
  const totalPages = Math.ceil(sections.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return sections.slice(indexOfFirstItem, indexOfLastItem);
  }, [sections, currentPage, itemsPerPage]);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

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
      const res = await api.get(`/products/${section.id}`);
      const existing = res.data;

      const requestObject = {
        brandActivityAreaId: existing.brandActivityArea?.id || '',
        title: existing.title || '',
        description: existing.description || '',
        hasTable: existing.hasTable || false,
        catalogLink: existing.catalogLink || '',
        enTitle: existing.enTitle || '',
        enDescription: existing.enDescription || '',
        isActive: !existing.isActive,
      };

      const formData = new FormData();
      formData.append(
        'request',
        new Blob([JSON.stringify(requestObject)], { type: 'application/json' })
      );

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

      if (existing.tableImage?.imageData) {
        formData.append('tableImage', dataURLToFile(decodeImage(existing.tableImage.imageData)));
      }

      await api.put(`/products/${section.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      fetchSections();
    } catch (err) {
      console.error('Aktiflik güncellenemedi:', err);
    }
  };

  // Text Modal'ı açan fonksiyon
  const openTextModal = (content: string, title: string) => {
    setTextModalContent(content);
    setTextModalTitle(title);
    setIsTextModalOpen(true);
  };

  // Text Modal'ı kapatan fonksiyon
  const closeTextModal = () => {
    setIsTextModalOpen(false);
    setTextModalContent('');
    setTextModalTitle('');
  };

  // Image Gallery Modal'ı açan fonksiyon
  const openGalleryModal = (images: { imageData: string }[] | undefined, title: string) => {
    if (!images || images.length === 0) return;
    setGalleryImages(images.map(img => decodeImage(img.imageData)));
    setCurrentImageIndex(0); // İlk resmi göster
    setGalleryModalTitle(title);
    setIsGalleryModalOpen(true);
  };

  // Image Gallery Modal'ı kapatan fonksiyon
  const closeGalleryModal = () => {
    setIsGalleryModalOpen(false);
    setGalleryImages([]);
    setCurrentImageIndex(0);
    setGalleryModalTitle('');
  };

  // Sonraki görsele geçme
  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % galleryImages.length);
  };

  // Önceki görsele geçme
  const prevImage = () => {
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? galleryImages.length - 1 : prevIndex - 1
    );
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
                <option value="">Marka Etkinlikleri Alanı Seçiniz</option>
                {brandActivityAreas.map(area => (
                  <option key={area.id} value={area.id}>
                    {area.title}
                    {area.brands && area.brands.length > 0
                      ? ` - ${area.brands.map((brand: any) => brand.title).join(', ')}`
                      : ''
                    }
                  </option>
                ))}
              </select>
              <input type="text" name="title" value={formik.values.title} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Başlık" />
              <input type="text" name="catalogLink" value={formik.values.catalogLink} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Katalog Linki" />
              <textarea name="description" value={formik.values.description} onChange={formik.handleChange} className="w-full border rounded-md p-2 md:col-span-2" placeholder="Açıklama" />
              <input type="text" name="enTitle" value={formik.values.enTitle} onChange={formik.handleChange} className="w-full border rounded-md p-2" placeholder="Başlık (EN)" />
              <textarea name="enDescription" value={formik.values.enDescription} onChange={formik.handleChange} className="w-full border rounded-md p-2 md:col-span-2" placeholder="Açıklama (EN)" />
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
                  alt={`Ana görsel ${idx + 1}`}
                />
              ))}
              <label className="md:col-span-2">Sertifikalar (çoklu):
                <input type="file" multiple accept="image/*" onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  Promise.all(files.map(fileToBase64)).then(setCertificatesBase64);
                }} />
              </label>
              {certificatesBase64.map((img, idx) => (
                <img key={idx} src={img} className="h-16 inline-block rounded mr-2" alt={`Sertifika ${idx + 1}`} />
              ))}
              <label className="md:col-span-2">Tablo Görseli (tekli):
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) fileToBase64(file).then(setTableImageBase64);
                }} />
              </label>
              {tableImageBase64 && (
                <img src={tableImageBase64} className="h-24 rounded" alt="Tablo görseli" />
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
          <table className="table-auto border-collapse text-sm w-full">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 border text-left whitespace-nowrap">Marka Etkinlikleri</th>
                <th className="p-3 border text-left whitespace-nowrap">Başlık</th>
                <th className="p-3 border text-left whitespace-nowrap">(EN) Başlık</th>
                <th className="p-3 border text-left whitespace-nowrap">Açıklama</th>
                <th className="p-3 border text-left whitespace-nowrap">(EN) Açıklama</th>
                <th className="p-3 border text-left whitespace-nowrap">Katalog Linki</th>
                <th className="p-3 border text-left whitespace-nowrap">Tablo İçeriyor mu</th>
                <th className="p-3 border text-left whitespace-nowrap">Görsel</th>
                <th className="p-3 border text-left whitespace-nowrap">Sertifika Görseli</th>
                <th className="p-3 border text-left whitespace-nowrap">Tablo Görseli</th>
                <th className="p-3 border text-left whitespace-nowrap">Aktif mi</th>
                <th className="p-3 border text-left whitespace-nowrap">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map(section => (
                <tr key={section.id} className="text-center">
                  <td
                    className="p-3 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => openTextModal(section.brandActivityArea?.title + (section?.brandActivityArea?.brands && section?.brandActivityArea?.brands.length > 0 ? ` - ${section?.brandActivityArea?.brands.map((brand: any) => brand.title).join(', ')}` : ''), 'Marka Etkinlikleri')}
                  >
                    {truncateText(section.brandActivityArea?.title + (section?.brandActivityArea?.brands && section?.brandActivityArea?.brands.length > 0 ? ` - ${section?.brandActivityArea?.brands.map((brand: any) => brand.title).join(', ')}` : ''), 20)}
                  </td>
                  <td
                    className="p-3 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => openTextModal(section.title, 'Başlık')}
                  >
                    {truncateText(section.title)}
                  </td>
                  <td
                    className="p-3 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => openTextModal(section.enTitle, '(EN) Başlık')}
                  >
                    {truncateText(section.enTitle)}
                  </td>
                  <td
                    className="p-3 border text-left max-w-xs overflow-hidden text-ellipsis cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => openTextModal(section.description, 'Açıklama')}
                  >
                    {truncateText(section.description)}
                  </td>
                  <td
                    className="p-3 border text-left max-w-xs overflow-hidden text-ellipsis cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => openTextModal(section.enDescription, '(EN) Açıklama')}
                  >
                    {truncateText(section.enDescription)}
                  </td>
                  <td
                    className="p-3 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-50"
                    onDoubleClick={() => openTextModal(section.catalogLink, 'Katalog Linki')}
                  >
                    {truncateText(section.catalogLink)}
                  </td>
                  <td className="p-3 border text-left whitespace-nowrap">
                    <span className={section.hasTable ? 'text-green-600 font-semibold' : 'text-red-500'}>
                      {section.hasTable ? 'Evet' : 'Hayır'}
                    </span>
                  </td>
                  {/* Ana Görseller için değişiklik */}
                  <td className="p-3 border text-left whitespace-nowrap">
                    {section.images && section.images.length > 0 ? (
                      <div
                        className="relative h-16 w-16 group cursor-pointer"
                        onClick={() => openGalleryModal(section.images, `Ürün Görselleri: ${section.title}`)}
                      >
                        <img
                          src={decodeImage(section.images[0].imageData)} // İlk resmi göster
                          className="h-16 w-16 object-cover rounded-md"
                          alt={`Ürün görseli - ${section.title}`}
                        />
                        {section.images.length > 1 && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                            Büyüt
                          </div>
                        )}
                      </div>
                    ) : null}
                  </td>
                  {/* Sertifika Görselleri için değişiklik */}
                  <td className="p-3 border text-left whitespace-nowrap">
                    {section.certificates && section.certificates.length > 0 ? (
                      <div
                        className="relative h-16 w-16 group cursor-pointer"
                        onClick={() => openGalleryModal(section.certificates, `Sertifika Görselleri: ${section.title}`)}
                      >
                        <img
                          src={decodeImage(section.certificates[0].imageData)} // İlk sertifika resmini göster
                          className="h-16 w-16 object-cover rounded-md"
                          alt={`Sertifika görseli - ${section.title}`}
                        />
                        {section.certificates.length > 1 && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                            Büyüt
                          </div>
                        )}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3 border text-left whitespace-nowrap">
                    {section.tableImage?.imageData ? (
                      <div
                        className="relative h-16 w-16 group cursor-pointer"
                        onClick={() => openGalleryModal([section.tableImage!], `Tablo Görseli: ${section.title}`)}
                      >
                        <img
                          src={decodeImage(section.tableImage.imageData)}
                          alt={`Tablo görseli - ${section.title}`}
                          className="h-16 w-16 object-cover rounded-md"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                          Büyüt
                        </div>
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3 border text-left whitespace-nowrap">
                    <span className={section.isActive ? 'text-green-600 font-semibold' : 'text-red-500'}>
                      {section.isActive ? 'Evet' : 'Hayır'}
                    </span>
                  </td>
                  <td className="p-3 border text-left whitespace-nowrap space-x-2">
                    <button onClick={() => toggleActiveStatus(section)}
                      className={`${section.isActive ? 'bg-red-500' : 'bg-green-500'
                        } text-white px-3 py-1 rounded hover:opacity-90`}>
                      {section.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                    </button>
                    <button onClick={() => handleEdit(section)}
                      className="bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500 text-white">Düzenle</button>
                    <button onClick={() => handleDelete(section.id)}
                      className="bg-red-600 px-3 py-1 rounded text-white hover:bg-red-700">Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex justify-center mt-4">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              Önceki
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => paginate(i + 1)}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${currentPage === i + 1 ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              Sonraki
            </button>
          </nav>
          <div className="ml-4 flex items-center">
            <label htmlFor="items-per-page" className="sr-only">Items per page</label>
            <select
              id="items-per-page"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1); // Reset to first page when changing items per page
              }}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value={5}>5 / Sayfa</option>
              <option value={10}>10 / Sayfa</option>
              <option value={20}>20 / Sayfa</option>
              <option value={50}>50 / Sayfa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Text Modal Component */}
      {isTextModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative p-5 border w-1/2 shadow-lg rounded-md bg-white">
            <h3 className="text-xl font-bold mb-4">{textModalTitle}</h3>
            <div className="mt-3 text-center">
              <p className="text-gray-900 text-left whitespace-pre-wrap break-words">{textModalContent}</p>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={closeTextModal}
                  className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery Modal Component */}
      {isGalleryModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative p-5 border w-11/12 md:w-3/4 lg:w-1/2 max-h-[90vh] shadow-lg rounded-md bg-white flex flex-col items-center">
            <h3 className="text-xl font-bold mb-4 text-center">{galleryModalTitle}</h3>
            <div className="relative w-full flex items-center justify-center mb-4">
              {/* Prev Button */}
              {galleryImages.length > 1 && (
                <button
                  onClick={prevImage}
                  className="absolute left-0 top-1/2 -translate-y-1/2 bg-gray-800 text-white p-2 rounded-full z-10 opacity-75 hover:opacity-100 transition-opacity"
                >
                  &#8249; {/* Left arrow */}
                </button>
              )}
              {/* Current Image */}
              <img
                src={galleryImages[currentImageIndex]}
                alt={`${galleryModalTitle} - ${currentImageIndex + 1}`}
                className="max-w-full max-h-[60vh] object-contain rounded-md"
              />
              {/* Next Button */}
              {galleryImages.length > 1 && (
                <button
                  onClick={nextImage}
                  className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-800 text-white p-2 rounded-full z-10 opacity-75 hover:opacity-100 transition-opacity"
                >
                  &#8250; {/* Right arrow */}
                </button>
              )}
            </div>
            {galleryImages.length > 1 && (
              <div className="text-sm text-gray-600 mb-4">
                {currentImageIndex + 1} / {galleryImages.length}
              </div>
            )}
            <div className="mt-auto flex justify-end w-full"> {/* Kapat düğmesini en alta al */}
              <button
                onClick={closeGalleryModal}
                className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProductYonetimi;