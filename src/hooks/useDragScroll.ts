import { useState, useRef, useEffect, MouseEvent } from 'react';

export function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = (e: MouseEvent) => {
    if (!ref.current) return;
    setIsDown(true);
    ref.current.classList.add('cursor-grabbing');
    ref.current.classList.remove('cursor-grab');
    setStartX(e.pageX - ref.current.offsetLeft);
    setScrollLeft(ref.current.scrollLeft);
  };

  const onMouseLeave = () => {
    setIsDown(false);
    if (ref.current) {
        ref.current.classList.add('cursor-grab');
        ref.current.classList.remove('cursor-grabbing');
    }
  };

  const onMouseUp = () => {
    setIsDown(false);
    if (ref.current) {
        ref.current.classList.add('cursor-grab');
        ref.current.classList.remove('cursor-grabbing');
    }
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDown || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX) * 2; // scroll-fast factor
    ref.current.scrollLeft = scrollLeft - walk;
  };

  return {
    ref,
    onMouseDown,
    onMouseLeave,
    onMouseUp,
    onMouseMove,
    className: 'cursor-grab active:cursor-grabbing select-none'
  };
}
