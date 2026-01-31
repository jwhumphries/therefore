import { TransitionLink } from "./TransitionLink";

interface TagLinkProps {
  tag: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function TagLink({ tag, className = "", onClick }: TagLinkProps) {
  return (
    <TransitionLink
      to={`/tags/${tag}`}
      className={`tag-link ${className}`}
      onClick={onClick}
    >
      <span className="tag-hash">#</span>{tag}
    </TransitionLink>
  );
}

interface TagWithCountProps {
  tag: string;
  count: number;
  className?: string;
}

export function TagWithCount({ tag, count, className = "" }: TagWithCountProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <TagLink tag={tag} />
      <span className="text-muted">({count})</span>
    </span>
  );
}
