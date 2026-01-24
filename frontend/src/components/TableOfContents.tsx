import { useRef } from "react";
import { useScrollspy, type Heading } from "../hooks/useScrollspy";

interface TableOfContentsProps {
  containerRef: React.RefObject<HTMLElement | null>;
}

export function TableOfContents({ containerRef }: TableOfContentsProps) {
  const tocRef = useRef<HTMLElement>(null);
  const { headings, activeId, scrollToHeading } = useScrollspy({
    containerRef,
    tocRef,
  });

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav ref={tocRef} className="toc-nav" aria-label="Table of contents">
      <div className="text-sm font-medium text-default-500 mb-3 uppercase tracking-wider">
        On this page
      </div>
      <ul className="space-y-1">
        {headings.map((heading) => (
          <TocItem
            key={heading.id}
            heading={heading}
            isActive={activeId === heading.id}
            onClick={() => scrollToHeading(heading.id)}
          />
        ))}
      </ul>
    </nav>
  );
}

interface TocItemProps {
  heading: Heading;
  isActive: boolean;
  onClick: () => void;
}

function TocItem({ heading, isActive, onClick }: TocItemProps) {
  const indent = heading.level === 3 ? "pl-4" : "";

  return (
    <li className={indent}>
      <a
        href={`#${heading.id}`}
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        className={`
          inline-block text-sm py-1
          ${isActive ? "active" : "text-default-500 hover:text-foreground"}
        `}
      >
        {heading.text}
      </a>
    </li>
  );
}
