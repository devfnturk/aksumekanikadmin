import React from 'react';

type ImageModalContentProps = {
  title: string;
  imageUrl: string;
};

const ImageModalContent: React.FC<ImageModalContentProps> = ({ title, imageUrl }) => (
  <div>
    <h2 className="text-xl font-bold mb-4">{title}</h2>
    <img src={imageUrl} alt={title} className="max-w-full h-auto mx-auto" />
  </div>
);

export default ImageModalContent;