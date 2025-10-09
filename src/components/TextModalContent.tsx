import React from 'react';

type TextModalContentProps = {
  title: string;
  content: string;
};

const TextModalContent: React.FC<TextModalContentProps> = ({ title, content }) => (
  <div>
    <h2 className="text-xl font-bold mb-4">{title}</h2>
    <p className="whitespace-pre-wrap break-words">{content}</p>
  </div>
);

export default TextModalContent;