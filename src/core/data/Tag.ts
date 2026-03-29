/**
 * Zotero Tag class
 * Represents a tag in a library
 */
export class Tag {
  tag: string;
  type: number;
  count?: number;

  constructor(tag: string, type: number = 0, count?: number) {
    this.tag = tag;
    this.type = type;
    this.count = count;
  }

  /**
   * Check if tag is colored
   */
  isColored(): boolean {
    return this.type > 0;
  }

  /**
   * Get color information
   */
  getColor(): { color: string; position: number } | null {
    if (!this.isColored()) {
      return null;
    }

    // Color types: 1-9 correspond to specific colors and positions
    const colors = [
      null,
      { color: '#566240', position: 0 },  // 1
      { color: '#a90b0b', position: 1 },  // 2
      { color: '#a47900', position: 2 },  // 3
      { color: '#005f9e', position: 3 },  // 4
      { color: '#9902a8', position: 4 },  // 5
      { color: '#008b8b', position: 5 },  // 6
      { color: '#b97d00', position: 6 },  // 7
      { color: '#008000', position: 7 },  // 8
      { color: '#666666', position: 8 }   // 9
    ];

    return colors[this.type] || null;
  }

  /**
   * Convert to JSON
   */
  toJSON(): any {
    return {
      tag: this.tag,
      type: this.type
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(json: any): Tag {
    return new Tag(
      json.tag || json.tag,
      json.type || 0,
      json.count
    );
  }

  /**
   * Check if tag is valid
   */
  isValid(): boolean {
    // Tags cannot be empty
    if (!this.tag || this.tag.trim().length === 0) {
      return false;
    }

    // Tags have a maximum length
    if (this.tag.length > 255) {
      return false;
    }

    return true;
  }

  /**
   * Clean tag name
   */
  static clean(tag: string): string {
    return tag.trim().replace(/\s+/g, ' ');
  }

  /**
   * Compare two tags
   */
  equals(other: Tag): boolean {
    return this.tag === other.tag && this.type === other.type;
  }
}
