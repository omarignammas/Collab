import { useEffect, useState } from 'react';

// Reserves space for the longest word (invisible) so swapping words never
// reflows the surrounding heading, then settles the incoming word into place
// with the same spring easing used elsewhere on this page, plus a curved
// underline that redraws itself under each new word.
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
          className={`absolute inset-x-0 bottom-0 whitespace-nowrap transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            i === index ? 'z-10 translate-y-0 opacity-100 blur-0' : 'z-0 translate-y-3 opacity-0 blur-[2px]'
          }`}
        >
          {word}
        </span>
      ))}
      <svg
        key={index}
        className="pointer-events-none absolute -bottom-1.5 left-0 h-2 w-full overflow-visible text-current"
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
      >
        <path
          d="M2 5 Q 50 -2 98 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="animate-draw-underline opacity-60"
          style={{ strokeDasharray: 120 }}
        />
      </svg>
    </span>
  );
};

export default RotatingWord;
