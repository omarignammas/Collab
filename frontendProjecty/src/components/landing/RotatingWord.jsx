import { useEffect, useState } from 'react';

// Reserves space for the longest word (invisible) so swapping words never
// reflows the surrounding heading, then slides the active word in/out on top of it.
export const RotatingWord = ({ words, interval = 2200, className = '' }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words, interval]);

  const longest = words.reduce((a, b) => (a.length > b.length ? a : b));

  return (
    <span className={`relative inline-block text-left align-bottom ${className}`}>
      <span className="invisible whitespace-nowrap">{longest}</span>
      {words.map((word, i) => (
        <span
          key={word}
          aria-hidden={i !== index}
          className={`absolute inset-0 whitespace-nowrap transition-all duration-500 ease-out ${
            i === index ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
          }`}
        >
          {word}
        </span>
      ))}
    </span>
  );
};

export default RotatingWord;
