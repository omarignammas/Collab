import { useEffect, useRef, useState } from 'react';

const supportsIntersectionObserver = typeof IntersectionObserver !== 'undefined';

// Fades/slides children in once they scroll into view, then stops watching.
export const Reveal = (props) => {
  const { children, className = '', delay = 0 } = props;
  const Tag = props.as || 'div';
  const ref = useRef(null);
  const [visible, setVisible] = useState(!supportsIntersectionObserver);

  useEffect(() => {
    if (!supportsIntersectionObserver) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
