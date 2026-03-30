import React, { useState } from 'react';
import { getTagColor, getTagTextColor, getTagBorderColor } from '../utils/tagColors';
import './ItemTags.css';

interface ItemTagsProps {
  tags: string[];
  maxDisplay?: number;
  onTagClick?: (tag: string) => void;
}

export const ItemTags: React.FC<ItemTagsProps> = ({
  tags,
  maxDisplay = 3,
  onTagClick
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!tags || tags.length === 0) {
    return null;
  }

  const displayTags = expanded ? tags : tags.slice(0, maxDisplay);
  const hasMore = tags.length > maxDisplay;

  const handleTagClick = (tag: string) => {
    if (onTagClick) {
      onTagClick(tag);
    }
  };

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div className="item-tags">
      {displayTags.map((tag, index) => {
        const bgColor = getTagColor(tag);
        const textColor = getTagTextColor(bgColor);
        const borderColor = getTagBorderColor(bgColor);

        return (
          <span
            key={index}
            className="item-tag"
            style={{
              backgroundColor: bgColor,
              color: textColor,
              borderColor: borderColor
            }}
            onClick={() => handleTagClick(tag)}
            title={tag}
          >
            {tag.length > 15 ? `${tag.substring(0, 15)}...` : tag}
          </span>
        );
      })}

      {hasMore && !expanded && (
        <span
          className="item-tag-more"
          onClick={handleMoreClick}
          title={`显示全部 ${tags.length} 个标签`}
        >
          +{tags.length - maxDisplay}
        </span>
      )}

      {hasMore && expanded && (
        <span
          className="item-tag-more"
          onClick={handleMoreClick}
          title="收起"
        >
          ▲
        </span>
      )}
    </div>
  );
};
