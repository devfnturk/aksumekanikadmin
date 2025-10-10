import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import pako from 'pako';
import { useFormik } from 'formik';
import Swal from 'sweetalert2';
import { useLoading } from '../contexts/LoadingContext';
import './css/productYonetimi.css';

// TIPTAP İÇİN YENİ IMPORT'LAR
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import {Table} from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import CodeBlock from '@tiptap/extension-code-block';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

// --------------------------------------------------------------------------------
// TYPES & HELPERS
// --------------------------------------------------------------------------------

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
        fieldOfActivity: any;
    };
    processed: {
        mainImages: string[];
        certificateImages: string[];
        tableImage: string;
        brandAreaText: string;
    };
};

type BrandActivityArea = {
    id: string;
    title: string;
    brands: any;
    fieldOfActivity: any;
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

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const dataURLToFile = (dataUrl: string): File => {
    const arr = dataUrl.split(','),
        mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg',
        bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], 'image.jpg', { type: mime });
};

const truncateText = (text: string | undefined, maxLength: number = 50): string => {
    if (!text) return '';
    const plainText = text.replace(/<[^>]*>/g, '');
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
};

const formatBrandActivityAreaTitle = (area: any): string => {
    if (!area) return 'İlişki Yok';
    const brandTitle = area.brands?.[0]?.title;
    const activityTitle = area.fieldOfActivity?.[0]?.title;
    if (brandTitle && activityTitle) return `${brandTitle} - ${activityTitle}`;
    return brandTitle || activityTitle || 'Başlıksız Alan';
};

const StyledConfirmSwal = Swal.mixin({
    customClass: { 
        confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mx-2', 
        cancelButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mx-2' 
    },
    buttonsStyling: false
});

const StyledInfoSwal = Swal.mixin({
    customClass: { confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700' },
    buttonsStyling: false
});

// --------------------------------------------------------------------------------
// TIPTAP EDITOR COMPONENTS - YENİ
// --------------------------------------------------------------------------------

const MenuBar = ({ editor }: { editor: any }) => {
    // SORUNU ÇÖZMEK İÇİN YAPILAN DEĞİŞİKLİK:
    // useCallback hook'ları, koşullu return ifadesinden önceye, yani component'in en üst seviyesine taşındı.
    const setLink = useCallback(() => {
        if (!editor) return;
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const addImage = useCallback(() => {
        if (!editor) return;
        const url = window.prompt('Resim URL');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    }, [editor]);

    // Koşullu render burada kalmaya devam ediyor. Bu sayede hook'lar her zaman çağrılır,
    // ama JSX sadece 'editor' mevcut olduğunda render edilir.
    if (!editor) {
        return null;
    }

    return (
        <div className="MenuBar border border-b-0 border-gray-300 rounded-t-md p-2 flex flex-wrap gap-2">
            {/* Temel Stiller */}
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''}>Kalın</button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''}>İtalik</button>
            <button type="button" onClick={() => editor.chain().focus().toggleHighlight().run()} className={editor.isActive('highlight') ? 'is-active' : ''}>Vurgu</button>
            <button type="button" onClick={() => editor.chain().focus().toggleSuperscript().run()} className={editor.isActive('superscript') ? 'is-active' : ''}>x²</button>
            <button type="button" onClick={() => editor.chain().focus().toggleSubscript().run()} className={editor.isActive('subscript') ? 'is-active' : ''}>x₂</button>

            {/* Hizalama */}
            <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}>Sola</button>
            <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}>Orta</button>
            <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}>Sağa</button>
            
            {/* Blok Tipleri */}
            <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}>H2</button>
            <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'is-active' : ''}>Liste</button>
            <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={editor.isActive('taskList') ? 'is-active' : ''}>Görev Listesi</button>
            <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={editor.isActive('codeBlock') ? 'is-active' : ''}>Kod Bloğu</button>
            
            {/* Link & Resim */}
            <button type="button" onClick={setLink} className={editor.isActive('link') ? 'is-active' : ''}>Link</button>
            <button type="button" onClick={addImage}>Resim</button>
            
            {/* Tablo */}
            <button type="button" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Tablo Ekle</button>
            <button type="button" onClick={() => editor.chain().focus().addColumnAfter().run()} disabled={!editor.can().addColumnAfter()}>Sütun Ekle</button>
            <button type="button" onClick={() => editor.chain().focus().addRowAfter().run()} disabled={!editor.can().addRowAfter()}>Satır Ekle</button>
            <button type="button" onClick={() => editor.chain().focus().deleteTable().run()} disabled={!editor.can().deleteTable()}>Tabloyu Sil</button>
        </div>
    );
};

// Editör hook'unu yeni eklentilerle güncelleyelim
const TiptapEditor = memo(({ value, onChange, placeholder }: { value: string; onChange: (data: string) => void; placeholder?: string; }) => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder }),
            Link.configure({ openOnClick: false, autolink: true }),
            Image,
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            CodeBlock,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Highlight,
            Superscript,
            Subscript,
            TaskList,
            TaskItem.configure({ nested: true }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });
    
    useEffect(() => {
        if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
            editor.commands.setContent(value, false || undefined);
        }
    }, [value, editor]);

    return (
        <div className="border border-gray-300 rounded-md">
            <MenuBar editor={editor} />
            <EditorContent editor={editor} className="min-h-[200px]" />
        </div>
    );
});
TiptapEditor.displayName = "TiptapEditor";

// --------------------------------------------------------------------------------
// CHILD COMPONENTS
// --------------------------------------------------------------------------------

const ProductRow = memo(({ section, onToggleActive, onEdit, onDelete, onOpenTextModal, onOpenGalleryModal }: { section: Section, onToggleActive: (section: Section) => void, onEdit: (section: Section) => void, onDelete: (id: string) => void, onOpenTextModal: (content: string, title: string) => void, onOpenGalleryModal: (images: string[], title: string) => void }) => {
    return (
        <tr className="text-center">
            <td className="p-3 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-50" onDoubleClick={() => onOpenTextModal(section.processed.brandAreaText, 'Marka Etkinlikleri')}>{truncateText(section.processed.brandAreaText, 20)}</td>
            <td className="p-3 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-50" onDoubleClick={() => onOpenTextModal(section.title, 'Başlık')}>{truncateText(section.title)}</td>
            <td className="p-3 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-50" onDoubleClick={() => onOpenTextModal(section.enTitle, '(EN) Başlık')}>{truncateText(section.enTitle)}</td>
            <td className="p-3 border text-left max-w-xs overflow-hidden text-ellipsis cursor-pointer hover:bg-gray-50" onDoubleClick={() => onOpenTextModal(section.description, 'Açıklama')}>{truncateText(section.description)}</td>
            <td className="p-3 border text-left max-w-xs overflow-hidden text-ellipsis cursor-pointer hover:bg-gray-50" onDoubleClick={() => onOpenTextModal(section.enDescription, '(EN) Açıklama')}>{truncateText(section.enDescription)}</td>
            <td className="p-3 border text-left whitespace-nowrap cursor-pointer hover:bg-gray-50" onDoubleClick={() => onOpenTextModal(section.catalogLink, 'Katalog Linki')}>{truncateText(section.catalogLink)}</td>
            <td className="p-3 border"><span className={section.hasTable ? 'text-green-600 font-semibold' : 'text-red-500'}>{section.hasTable ? 'Evet' : 'Hayır'}</span></td>
            <td className="p-3 border">{section.processed.mainImages.length > 0 && (<div className="relative h-16 w-16 group cursor-pointer" onClick={() => onOpenGalleryModal(section.processed.mainImages, `Ürün Görselleri: ${section.title}`)}><img src={section.processed.mainImages[0]} className="h-16 w-16 object-cover rounded-md" alt={`Ürün görseli - ${section.title}`} />{section.processed.mainImages.length > 1 && (<div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity">Büyüt</div>)}</div>)}</td>
            <td className="p-3 border">{section.processed.certificateImages.length > 0 && (<div className="relative h-16 w-16 group cursor-pointer" onClick={() => onOpenGalleryModal(section.processed.certificateImages, `Sertifika Görselleri: ${section.title}`)}><img src={section.processed.certificateImages[0]} className="h-16 w-16 object-cover rounded-md" alt={`Sertifika görseli - ${section.title}`} />{section.processed.certificateImages.length > 1 && (<div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity">Büyüt</div>)}</div>)}</td>
            <td className="p-3 border">{section.processed.tableImage && (<div className="relative h-16 w-16 group cursor-pointer" onClick={() => onOpenGalleryModal([section.processed.tableImage], `Tablo Görseli: ${section.title}`)}><img src={section.processed.tableImage} alt={`Tablo görseli - ${section.title}`} className="h-16 w-16 object-cover rounded-md" /><div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-xs font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity">Büyüt</div></div>)}</td>
            <td className="p-3 border"><span className={section.isActive ? 'text-green-600 font-semibold' : 'text-red-500'}>{section.isActive ? 'Evet' : 'Hayır'}</span></td>
            <td className="p-3 border whitespace-nowrap space-x-2">
                <button onClick={() => onToggleActive(section)} className={`${section.isActive ? 'bg-red-500' : 'bg-green-500'} text-white px-3 py-1 rounded hover:opacity-90`}>{section.isActive ? 'Pasifleştir' : 'Aktifleştir'}</button>
                <button onClick={() => onEdit(section)} className="bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500 text-white">Düzenle</button>
                <button onClick={() => onDelete(section.id)} className="bg-red-600 px-3 py-1 rounded text-white hover:bg-red-700">Sil</button>
            </td>
        </tr>
    );
});
ProductRow.displayName = "ProductRow";

const ProductTable = memo(({ items, ...props }: { items: Section[] } & any) => (
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
                    <th className="p-3 border text-left whitespace-nowrap">Tablo</th>
                    <th className="p-3 border text-left whitespace-nowrap">Görsel</th>
                    <th className="p-3 border text-left whitespace-nowrap">Sertifika</th>
                    <th className="p-3 border text-left whitespace-nowrap">Tablo Görseli</th>
                    <th className="p-3 border text-left whitespace-nowrap">Aktif</th>
                    <th className="p-3 border text-left whitespace-nowrap">İşlemler</th>
                </tr>
            </thead>
            <tbody>
                {items.map((section: Section) => <ProductRow key={section.id} section={section} {...props} />)}
            </tbody>
        </table>
    </div>
));
ProductTable.displayName = "ProductTable";

const ProductForm = ({ formik, brandActivityAreas, imageBase64, certificatesBase64, tableImageBase64, setImageBase64, setCertificatesBase64, setTableImageBase64, onCancel, editId }: any) => {
    return (
        <form onSubmit={formik.handleSubmit} className="bg-white p-6 rounded-xl shadow-lg space-y-6 border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select 
                    name="brandActivityAreaId" 
                    value={formik.values.brandActivityAreaId} 
                    onChange={formik.handleChange} 
                    className="w-full border rounded-md p-2" 
                    required
                >
                    <option value="">Marka Etkinlikleri Alanı Seçiniz</option>
                    {brandActivityAreas.map((area: BrandActivityArea) => (
                        <option key={area.id} value={area.id}>
                            {formatBrandActivityAreaTitle(area)}
                        </option>
                    ))}
                </select>

                <input 
                    type="text" 
                    name="title" 
                    value={formik.values.title} 
                    onChange={formik.handleChange} 
                    className="w-full border rounded-md p-2" 
                    placeholder="Başlık" 
                    required 
                />

                <input 
                    type="text" 
                    name="catalogLink" 
                    value={formik.values.catalogLink} 
                    onChange={formik.handleChange} 
                    className="w-full border rounded-md p-2" 
                    placeholder="Katalog Linki" 
                />

                {/* AÇIKLAMA - Tiptap Editor */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Açıklama
                    </label>
                    <TiptapEditor
                        value={formik.values.description}
                        onChange={(data) => formik.setFieldValue('description', data)}
                        placeholder="Ürün açıklamasını giriniz..."
                    />
                </div>

                <input 
                    type="text" 
                    name="enTitle" 
                    value={formik.values.enTitle} 
                    onChange={formik.handleChange} 
                    className="w-full border rounded-md p-2" 
                    placeholder="Başlık (EN)" 
                />

                {/* AÇIKLAMA (EN) - Tiptap Editor */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Açıklama (EN)
                    </label>
                    <TiptapEditor
                        value={formik.values.enDescription}
                        onChange={(data) => formik.setFieldValue('enDescription', data)}
                        placeholder="Product description in English..."
                    />
                </div>

                <label className="flex items-center gap-2 md:col-span-2">
                    <input type="checkbox" name="hasTable" checked={formik.values.hasTable} onChange={formik.handleChange} />
                    Tablo içeriyor mu?
                </label>

                <label className="flex items-center gap-2 md:col-span-2">
                    <input type="checkbox" name="isActive" checked={formik.values.isActive} onChange={formik.handleChange} />
                    Aktif mi?
                </label>

                <label className="md:col-span-2">
                    Ana Görseller (çoklu):
                    <input type="file" multiple accept="image/*" onChange={(e) => { const files = Array.from(e.target.files || []); Promise.all(files.map(fileToBase64)).then(setImageBase64); }} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </label>
                <div className="md:col-span-2 flex flex-wrap gap-2">{imageBase64.map((img: string, idx: number) => (<img key={idx} src={img} className="h-24 w-24 object-cover inline-block rounded" alt={`Ana görsel ${idx + 1}`} />))}</div>

                <label className="md:col-span-2">
                    Sertifikalar (çoklu):
                    <input type="file" multiple accept="image/*" onChange={(e) => { const files = Array.from(e.target.files || []); Promise.all(files.map(fileToBase64)).then(setCertificatesBase64); }} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </label>
                <div className="md:col-span-2 flex flex-wrap gap-2">{certificatesBase64.map((img: string, idx: number) => (<img key={idx} src={img} className="h-16 w-16 object-cover inline-block rounded" alt={`Sertifika ${idx + 1}`} />))}</div>

                <label className="md:col-span-2">
                    Tablo Görseli (tekli):
                    <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) fileToBase64(file).then(setTableImageBase64); }} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </label>
                {tableImageBase64 && (<img src={tableImageBase64} className="h-24 w-24 object-cover rounded" alt="Tablo görseli" />)}
            </div>

            <div className="text-right flex justify-end gap-4 mt-8">
                <button type="button" onClick={onCancel} className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600">İptal</button>
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">{editId ? 'Güncelle' : 'Kaydet'}</button>
            </div>
        </form>
    );
};
ProductForm.displayName = "ProductForm";

const TextModal = memo(({ isOpen, title, content, onClose }: { isOpen: boolean, title: string, content: string, onClose: () => void }) => {
    if (!isOpen) return null;
    return <div className="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full flex items-center justify-center z-50"><div className="relative p-5 border w-1/2 shadow-lg rounded-md bg-white"><h3 className="text-xl font-bold mb-4">{title}</h3><div className="mt-3 text-center"><div className="text-gray-900 text-left" dangerouslySetInnerHTML={{ __html: content }} /><div className="mt-4 flex justify-end"><button onClick={onClose} className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700">Kapat</button></div></div></div></div>;
});
TextModal.displayName = "TextModal";

const GalleryModal = memo(({ isOpen, title, images, currentIndex, onClose, onNext, onPrev }: { isOpen: boolean, title: string, images: string[], currentIndex: number, onClose: () => void, onNext: () => void, onPrev: () => void }) => {
    if (!isOpen) return null;
    return <div className="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-full flex items-center justify-center z-50"><div className="relative p-5 border w-11/12 md:w-3/4 lg:w-1/2 max-h-[90vh] shadow-lg rounded-md bg-white flex flex-col items-center"><h3 className="text-xl font-bold mb-4 text-center">{title}</h3><div className="relative w-full flex items-center justify-center mb-4">{images.length > 1 && (<button onClick={onPrev} className="absolute left-0 top-1/2 -translate-y-1/2 bg-gray-800 text-white p-2 rounded-full z-10 opacity-75 hover:opacity-100">&#8249;</button>)}<img src={images[currentIndex]} alt={`${title} - ${currentIndex + 1}`} className="max-w-full max-h-[60vh] object-contain rounded-md" />{images.length > 1 && (<button onClick={onNext} className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-800 text-white p-2 rounded-full z-10 opacity-75 hover:opacity-100">&#8250;</button>)}</div>{images.length > 1 && (<div className="text-sm text-gray-600 mb-4">{currentIndex + 1} / {images.length}</div>)}<div className="mt-auto flex justify-end w-full"><button onClick={onClose} className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700">Kapat</button></div></div></div>;
});
GalleryModal.displayName = "GalleryModal";

const Pagination = memo(({ currentPage, totalPages, onPaginate, itemsPerPage, onItemsPerPageChange }: any) => (
    <div className="flex justify-center mt-4">
        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button onClick={() => onPaginate(currentPage - 1)} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">Önceki</button>
            {Array.from({ length: totalPages }, (_, i) => (<button key={i + 1} onClick={() => onPaginate(i + 1)} className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${currentPage === i + 1 ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}>{i + 1}</button>))}
            <button onClick={() => onPaginate(currentPage + 1)} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">Sonraki</button>
        </nav>
        <div className="ml-4 flex items-center">
            <select id="items-per-page" value={itemsPerPage} onChange={(e) => onItemsPerPageChange(Number(e.target.value))} className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                <option value={5}>5 / Sayfa</option><option value={10}>10 / Sayfa</option><option value={20}>20 / Sayfa</option><option value={50}>50 / Sayfa</option>
            </select>
        </div>
    </div>
));
Pagination.displayName = "Pagination";

// --------------------------------------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------------------------------------

const ProductYonetimi: React.FC = () => {
    const [sections, setSections] = useState<Section[]>([]);
    const [brandActivityAreas, setBrandActivityAreas] = useState<BrandActivityArea[]>([]);
    const { showLoading, hideLoading } = useLoading();
    const [pageError, setPageError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string[]>([]);
    const [certificatesBase64, setCertificatesBase64] = useState<string[]>([]);
    const [tableImageBase64, setTableImageBase64] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [textModal, setTextModal] = useState({ isOpen: false, content: '', title: '' });
    const [galleryModal, setGalleryModal] = useState({ isOpen: false, images: [] as string[], title: '', currentIndex: 0 });

    const fetchAllData = useCallback(async () => {
        showLoading();
        setPageError(null);
        try {
            const [productsRes, areasRes] = await Promise.all([api.get('/products'), api.get('/brand-activity-areas')]);
            setBrandActivityAreas(areasRes.data);
            const processedData = productsRes.data.map((section: Omit<Section, 'processed'>) => ({
                ...section,
                processed: {
                    mainImages: section.images?.map(img => decodeImage(img.imageData)) || [],
                    certificateImages: section.certificates?.map(img => decodeImage(img.imageData)) || [],
                    tableImage: section.tableImage?.imageData ? decodeImage(section.tableImage.imageData) : '',
                    brandAreaText: formatBrandActivityAreaTitle(section.brandActivityArea)
                }
            }));
            setSections(processedData);
        } catch (err) {
            console.error('Veri çekme hatası', err);
            setPageError('Veriler yüklenirken bir hata oluştu. Lütfen sayfanızı yenileyin.');
        } finally {
            hideLoading();
        }
    }, [showLoading, hideLoading]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const formik = useFormik({
        initialValues: { title: '', description: '', enTitle: '', enDescription: '', hasTable: false, catalogLink: '', brandActivityAreaId: '', isActive: false, },
        onSubmit: async (values, { resetForm }) => {
            const isEditing = !!editId;
            const result = await StyledConfirmSwal.fire({ title: isEditing ? 'Değişiklikler Kaydedilsin mi?' : 'Yeni Ürün Eklensin mi?', icon: 'question', showCancelButton: true, confirmButtonText: 'Evet', cancelButtonText: 'Hayır' });
            if (!result.isConfirmed) return;

            showLoading();
            try {
                const requestObject = { brandActivityAreaId: values.brandActivityAreaId, title: values.title, description: values.description, hasTable: values.hasTable, catalogLink: values.catalogLink, enTitle: values.enTitle, enDescription: values.enDescription, isActive: values.isActive };
                const formData = new FormData();
                formData.append('request', new Blob([JSON.stringify(requestObject)], { type: 'application/json' }));
                if (imageBase64.length > 0) imageBase64.forEach(img => formData.append('images', dataURLToFile(img)));
                if (certificatesBase64.length > 0) certificatesBase64.forEach(cert => formData.append('certificates', dataURLToFile(cert)));
                if (tableImageBase64) formData.append('tableImage', dataURLToFile(tableImageBase64));

                if (isEditing) {
                    await api.put(`/products/${editId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                } else {
                    await api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                }

                await fetchAllData();
                StyledInfoSwal.fire({ title: 'Başarılı!', text: `Ürün başarıyla ${isEditing ? 'güncellendi' : 'eklendi'}.`, icon: 'success' });

                resetForm();
                setEditId(null);
                setImageBase64([]);
                setCertificatesBase64([]);
                setTableImageBase64('');
                setIsFormOpen(false);
            } catch (err) {
                console.error('Form gönderme hatası:', err);
                StyledInfoSwal.fire('Hata!', 'İşlem sırasında bir sorun oluştu.', 'error');
            } finally {
                hideLoading();
            }
        }
    });

    const handleEdit = useCallback((section: Section) => {
        formik.setValues({ title: section.title, description: section.description, enTitle: section.enTitle, enDescription: section.enDescription, brandActivityAreaId: section.brandActivityArea.id, hasTable: section.hasTable, catalogLink: section.catalogLink, isActive: section.isActive, });
        setImageBase64(section.processed.mainImages);
        setCertificatesBase64(section.processed.certificateImages);
        setTableImageBase64(section.processed.tableImage);
        setEditId(section.id);
        setIsFormOpen(true);
        window.scrollTo(0, 0);
    }, [formik]);

    const handleDelete = useCallback(async (id: string) => {
        const result = await StyledConfirmSwal.fire({ title: 'Emin misiniz?', text: "Bu ürün kalıcı olarak silinecek!", icon: 'warning', showCancelButton: true, confirmButtonText: 'Evet, Sil!', cancelButtonText: 'İptal' });
        if (!result.isConfirmed) return;

        showLoading();
        try {
            await api.delete(`/products/${id}`);
            await fetchAllData();
            StyledInfoSwal.fire('Silindi!', 'Ürün başarıyla silindi.', 'success');
        } catch (err) {
            console.error('Silme hatası:', err);
            StyledInfoSwal.fire('Hata!', 'Silme işlemi sırasında bir sorun oluştu.', 'error');
        } finally {
            hideLoading();
        }
    }, [fetchAllData, showLoading, hideLoading]);

    const toggleActiveStatus = useCallback(async (section: Section) => {
        const result = await StyledConfirmSwal.fire({ title: section.isActive ? 'Ürün Pasifleştirilsin mi?' : 'Ürün Aktifleştirilsin mi?', icon: 'question', showCancelButton: true, confirmButtonText: 'Evet', cancelButtonText: 'Hayır' });
        if (!result.isConfirmed) return;

        showLoading();
        try {
            const requestObject = { brandActivityAreaId: section.brandActivityArea?.id || '', title: section.title || '', description: section.description || '', hasTable: section.hasTable || false, catalogLink: section.catalogLink || '', enTitle: section.enTitle || '', enDescription: section.enDescription || '', isActive: !section.isActive };
            const formData = new FormData();
            formData.append('request', new Blob([JSON.stringify(requestObject)], { type: 'application/json' }));
            if (section.processed.mainImages.length) section.processed.mainImages.forEach(imgDataUrl => formData.append('images', dataURLToFile(imgDataUrl)));
            if (section.processed.certificateImages.length) section.processed.certificateImages.forEach(certDataUrl => formData.append('certificates', dataURLToFile(certDataUrl)));
            if (section.processed.tableImage) formData.append('tableImage', dataURLToFile(section.processed.tableImage));

            await api.put(`/products/${section.id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            await fetchAllData();
            StyledInfoSwal.fire('Güncellendi!', 'Ürünün aktiflik durumu değiştirildi.', 'success');
        } catch (err) {
            console.error('Aktiflik güncellenemedi:', err);
            StyledInfoSwal.fire('Hata!', 'Durum güncellenirken bir sorun oluştu.', 'error');
        } finally {
            hideLoading();
        }
    }, [fetchAllData, showLoading, hideLoading]);

    const handleCancelEdit = useCallback(() => {
        formik.resetForm();
        setEditId(null);
        setImageBase64([]);
        setCertificatesBase64([]);
        setTableImageBase64('');
        setIsFormOpen(false);
    }, [formik]);

    const totalPages = Math.ceil(sections.length / itemsPerPage);
    const currentItems = useMemo(() => sections.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [sections, currentPage, itemsPerPage]);
    const paginate = useCallback((pageNumber: number) => setCurrentPage(pageNumber), []);
    const handleItemsPerPageChange = useCallback((value: number) => { setItemsPerPage(value); setCurrentPage(1); }, []);
    const openTextModal = useCallback((content: string, title: string) => { setTextModal({ isOpen: true, content, title }); }, []);
    const closeTextModal = useCallback(() => { setTextModal({ isOpen: false, content: '', title: '' }); }, []);
    const openGalleryModal = useCallback((images: string[], title: string) => { if (!images || images.length === 0) return; setGalleryModal({ isOpen: true, images, title, currentIndex: 0 }); }, []);
    const closeGalleryModal = useCallback(() => { setGalleryModal(prev => ({ ...prev, isOpen: false })); }, []);
    const nextImage = useCallback(() => { setGalleryModal(prev => ({ ...prev, currentIndex: (prev.currentIndex + 1) % prev.images.length })); }, []);
    const prevImage = useCallback(() => { setGalleryModal(prev => ({ ...prev, currentIndex: prev.currentIndex === 0 ? prev.images.length - 1 : prev.currentIndex - 1 })); }, []);

    if (pageError) return <Layout><div className="p-6 text-center text-red-600 bg-red-100 rounded-md">{pageError}</div></Layout>;

    return (
        <Layout>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Ürün Yönetimi</h1>
                    <button onClick={() => isFormOpen ? handleCancelEdit() : setIsFormOpen(true)} className={`${isFormOpen ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded transition-colors`}>{isFormOpen ? 'Formu Kapat' : 'Yeni Ürün Ekle'}</button>
                </div>

                {isFormOpen && (
                    <ProductForm formik={formik} brandActivityAreas={brandActivityAreas} imageBase64={imageBase64} certificatesBase64={certificatesBase64} tableImageBase64={tableImageBase64} setImageBase64={setImageBase64} setCertificatesBase64={setCertificatesBase64} setTableImageBase64={setTableImageBase64} onCancel={handleCancelEdit} editId={editId} />
                )}

                <div className="mt-6">
                    <ProductTable items={currentItems} onEdit={handleEdit} onDelete={handleDelete} onToggleActive={toggleActiveStatus} onOpenTextModal={openTextModal} onOpenGalleryModal={openGalleryModal} />
                </div>

                <Pagination currentPage={currentPage} totalPages={totalPages} onPaginate={paginate} itemsPerPage={itemsPerPage} onItemsPerPageChange={handleItemsPerPageChange} />
            </div>

            <TextModal isOpen={textModal.isOpen} title={textModal.title} content={textModal.content} onClose={closeTextModal} />
            <GalleryModal isOpen={galleryModal.isOpen} title={galleryModal.title} images={galleryModal.images} currentIndex={galleryModal.currentIndex} onClose={closeGalleryModal} onNext={nextImage} onPrev={prevImage} />
        </Layout>
    );
};

export default ProductYonetimi;
